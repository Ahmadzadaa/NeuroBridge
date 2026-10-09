import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { prorate, seatSubtotal } from "@/lib/billing/money";
import {
  daysRemainingInPeriod,
  periodLengthInDays,
  type BillingPeriod,
} from "@/lib/billing/period";
import {
  currentPeriodOf,
  lockSubscriptionForUpdate,
} from "@/lib/billing/subscription-service";
import { createInvoice } from "@/lib/billing/invoice-service";
import {
  BelowMinimumSeatsError,
  SeatChangeNotNeededError,
  SeatsBelowActiveUsersError,
  SubscriptionNotActiveError,
  SubscriptionNotFoundError,
} from "@/lib/billing/errors";

export type SeatChangeDirection = "INCREASE" | "DECREASE";

export interface SeatChangePreview {
  direction: SeatChangeDirection;
  currentSeats: number;
  requestedSeats: number;
  seatDelta: number;
  /** Integer kuruş charged now. Always 0 for a decrease. */
  amountDue: number;
  currency: string;
  /** When the new seat count starts to apply. */
  effectiveAt: Date;
  daysRemaining: number;
  daysInPeriod: number;
  /** What the next full period will cost once the change is in effect. */
  nextPeriodAmount: number;
}

/**
 * Seats currently occupied. The rest of the app tracks this on the tenant,
 * incremented when a participant registers, so billing reuses it rather than
 * inventing a second definition of "active user".
 */
async function occupiedSeats(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { seatsUsed: true },
  });
  return tenant?.seatsUsed ?? 0;
}

function assertChangeAllowed(
  requestedSeats: number,
  currentSeats: number,
  minSeats: number,
  occupied: number
): SeatChangeDirection {
  if (!Number.isInteger(requestedSeats) || requestedSeats < 0) {
    throw new RangeError(`Seat count must be a non-negative integer`);
  }
  if (requestedSeats === currentSeats) {
    throw new SeatChangeNotNeededError();
  }
  if (requestedSeats < minSeats) {
    throw new BelowMinimumSeatsError(minSeats);
  }
  // Only a reduction can strand existing users.
  if (requestedSeats < currentSeats && requestedSeats < occupied) {
    throw new SeatsBelowActiveUsersError(occupied);
  }

  return requestedSeats > currentSeats ? "INCREASE" : "DECREASE";
}

function buildPreview(params: {
  direction: SeatChangeDirection;
  currentSeats: number;
  requestedSeats: number;
  pricePerSeat: number;
  currency: string;
  period: BillingPeriod;
  now: Date;
}): SeatChangePreview {
  const { direction, currentSeats, requestedSeats, pricePerSeat, period, now } =
    params;

  const daysInPeriod = periodLengthInDays(period);
  const daysRemaining = daysRemainingInPeriod(period, now);
  const seatDelta = requestedSeats - currentSeats;

  // An increase is charged immediately for the unused part of the period.
  // A decrease is never refunded; it simply takes effect next period.
  const amountDue =
    direction === "INCREASE"
      ? prorate({
          pricePerSeatKurus: pricePerSeat,
          addedSeats: seatDelta,
          daysRemaining,
          daysInPeriod,
        })
      : 0;

  return {
    direction,
    currentSeats,
    requestedSeats,
    seatDelta,
    amountDue,
    currency: params.currency,
    effectiveAt: direction === "INCREASE" ? now : period.end,
    daysRemaining,
    daysInPeriod,
    nextPeriodAmount: seatSubtotal(pricePerSeat, requestedSeats),
  };
}

/**
 * Prices a seat change without touching anything — backs the
 * "what will this cost me?" screen.
 */
export async function previewSeatChange(
  tenantId: string,
  requestedSeats: number,
  now = new Date()
): Promise<SeatChangePreview> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  if (!subscription) throw new SubscriptionNotFoundError();

  const occupied = await occupiedSeats(tenantId);
  const direction = assertChangeAllowed(
    requestedSeats,
    subscription.seats,
    subscription.plan.minSeats,
    occupied
  );

  return buildPreview({
    direction,
    currentSeats: subscription.seats,
    requestedSeats,
    pricePerSeat: subscription.pricePerSeatMonthly,
    currency: subscription.currency,
    period: currentPeriodOf(subscription),
    now,
  });
}

export interface SeatChangeResult {
  preview: SeatChangePreview;
  /** Present only for an increase — the invoice that must be paid first. */
  invoiceId?: string;
  merchantOid?: string;
  applied: boolean;
}

/**
 * Requests a seat change.
 *
 * Increase: creates an invoice and stops. Seats move only once that invoice is
 * paid (`markInvoicePaid`), so a failed payment can never grant seats.
 *
 * Decrease: recorded as `pendingSeats` and applied at the period boundary.
 * There is no refund for the unused part of the current period.
 */
export async function requestSeatChange(input: {
  tenantId: string;
  requestedSeats: number;
  actorId?: string;
  now?: Date;
}): Promise<SeatChangeResult> {
  const now = input.now ?? new Date();

  const prepared = await prisma.$transaction(async (tx) => {
    const subscription = await lockSubscriptionForUpdate(tx, input.tenantId);

    if (subscription.status === "EXPIRED" || subscription.status === "CANCELED") {
      throw new SubscriptionNotActiveError(
        `Seats cannot be changed while the subscription is ${subscription.status}`
      );
    }

    const plan = await tx.plan.findUnique({
      where: { id: subscription.planId },
      select: { minSeats: true },
    });

    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { seatsUsed: true },
    });

    const direction = assertChangeAllowed(
      input.requestedSeats,
      subscription.seats,
      plan?.minSeats ?? 1,
      tenant?.seatsUsed ?? 0
    );

    const preview = buildPreview({
      direction,
      currentSeats: subscription.seats,
      requestedSeats: input.requestedSeats,
      pricePerSeat: subscription.pricePerSeatMonthly,
      currency: subscription.currency,
      period: currentPeriodOf(subscription),
      now,
    });

    if (direction === "DECREASE") {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { pendingSeats: input.requestedSeats },
      });

      await tx.seatChangeLog.create({
        data: {
          tenantId: input.tenantId,
          oldSeats: subscription.seats,
          newSeats: input.requestedSeats,
          changedBy: input.actorId ?? null,
          reason: "DOWNGRADE_SCHEDULED",
        },
      });

      await recordAudit({
        tx,
        action: AUDIT_ACTIONS.SEAT_DECREASE_SCHEDULED,
        tenantId: input.tenantId,
        userId: input.actorId,
        details: {
          currentSeats: subscription.seats,
          pendingSeats: input.requestedSeats,
          effectiveAt: preview.effectiveAt.toISOString(),
        },
      });
    }

    return { subscription, preview, direction };
  });

  if (prepared.direction === "DECREASE") {
    return { preview: prepared.preview, applied: true };
  }

  // Increase: bill for it. The invoice is created outside the lock so the
  // subscription row is not held while we write billing history.
  const invoice = await createInvoice({
    tenantId: input.tenantId,
    subscriptionId: prepared.subscription.id,
    amount: prepared.preview.amountDue,
    currency: prepared.subscription.currency,
    type: "SEAT_UPGRADE",
    seatCount: input.requestedSeats,
    periodStart: prepared.subscription.currentPeriodStart,
    periodEnd: prepared.subscription.currentPeriodEnd,
    actorId: input.actorId,
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SEAT_INCREASE_REQUESTED,
    tenantId: input.tenantId,
    userId: input.actorId,
    details: {
      invoiceId: invoice.id,
      currentSeats: prepared.subscription.seats,
      requestedSeats: input.requestedSeats,
      amountDue: prepared.preview.amountDue,
    },
  });

  return {
    preview: prepared.preview,
    invoiceId: invoice.id,
    merchantOid: invoice.merchantOid,
    applied: false,
  };
}

/**
 * Applies a scheduled decrease at the period boundary. Called by the renewal
 * job before it prices the next period, so the tenant is billed for the
 * reduced seat count.
 */
export async function applyPendingSeats(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const subscription = await lockSubscriptionForUpdate(tx, tenantId);

    if (
      subscription.pendingSeats === null ||
      subscription.pendingSeats === subscription.seats
    ) {
      return { applied: false as const, seats: subscription.seats };
    }

    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { seatsUsed: true },
    });
    const occupied = tenant?.seatsUsed ?? 0;

    // Users may have joined since the decrease was scheduled; never strand them.
    const newSeats = Math.max(subscription.pendingSeats, occupied);

    await tx.subscription.update({
      where: { id: subscription.id },
      data: { seats: newSeats, pendingSeats: null },
    });

    await tx.tenant.update({
      where: { id: tenantId },
      data: { seatLimit: newSeats },
    });

    await tx.seatChangeLog.create({
      data: {
        tenantId,
        oldSeats: subscription.seats,
        newSeats,
        reason: "DOWNGRADE_APPLIED",
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.SEAT_CHANGE_APPLIED,
      tenantId,
      details: {
        oldSeats: subscription.seats,
        newSeats,
        requestedSeats: subscription.pendingSeats,
        clampedToActiveUsers: newSeats !== subscription.pendingSeats,
      },
    });

    return { applied: true as const, seats: newSeats };
  });
}
