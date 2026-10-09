import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { isPostgresDatabase } from "@/lib/db/tenant-context";
import type { SubscriptionStatus } from "@/lib/types";
import { WRITABLE_SUBSCRIPTION_STATUSES } from "@/lib/types";
import { assertKurus, seatSubtotal } from "@/lib/billing/money";
import { monthlyPeriod, type BillingPeriod } from "@/lib/billing/period";
import {
  BelowMinimumSeatsError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
} from "@/lib/billing/errors";

export interface LockedSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  seats: number;
  pendingSeats: number | null;
  pricePerSeatMonthly: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/**
 * Serialises seat changes against renewal.
 *
 * Both flows read the seat count and write it back, so without a lock a
 * concurrent renewal could overwrite a seat upgrade. Postgres gets a real row
 * lock; SQLite has none, but its transactions already serialise writers, so a
 * plain read is equivalent there. Same pattern as `seats/seat-service.ts`.
 */
export async function lockSubscriptionForUpdate(
  tx: Prisma.TransactionClient,
  tenantId: string
): Promise<LockedSubscription> {
  if (isPostgresDatabase()) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        plan_id: string;
        status: string;
        seats: number;
        pending_seats: number | null;
        price_per_seat_monthly: number;
        currency: string;
        current_period_start: Date;
        current_period_end: Date;
      }>
    >`
      SELECT id, tenant_id, plan_id, status, seats, pending_seats,
             price_per_seat_monthly, currency,
             current_period_start, current_period_end
      FROM subscriptions
      WHERE tenant_id = ${tenantId}
      FOR UPDATE
    `;

    const row = rows[0];
    if (!row) throw new SubscriptionNotFoundError();

    return {
      id: row.id,
      tenantId: row.tenant_id,
      planId: row.plan_id,
      status: row.status as SubscriptionStatus,
      seats: row.seats,
      pendingSeats: row.pending_seats,
      pricePerSeatMonthly: row.price_per_seat_monthly,
      currency: row.currency,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
    };
  }

  const row = await tx.subscription.findUnique({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      planId: true,
      status: true,
      seats: true,
      pendingSeats: true,
      pricePerSeatMonthly: true,
      currency: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  if (!row) throw new SubscriptionNotFoundError();

  return { ...row, status: row.status as SubscriptionStatus };
}

export function currentPeriodOf(subscription: {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): BillingPeriod {
  return {
    start: subscription.currentPeriodStart,
    end: subscription.currentPeriodEnd,
  };
}

/** Whether the tenant may still write. EXPIRED tenants become read-only. */
export function grantsWriteAccess(status: SubscriptionStatus): boolean {
  return WRITABLE_SUBSCRIPTION_STATUSES.includes(status);
}

export async function getSubscription(tenantId: string) {
  return prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
}

/**
 * Whether the tenant is allowed to make changes right now.
 *
 * A tenant with no subscription at all is treated as writable: existing
 * organisations predate billing and must not be locked out by its arrival.
 */
export async function tenantHasWriteAccess(tenantId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { status: true },
  });

  if (!subscription) return true;
  return grantsWriteAccess(subscription.status as SubscriptionStatus);
}

export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  seats: number;
  /** Contract price for this tenant; defaults to the plan's list price. */
  pricePerSeatMonthly?: number;
  actorId?: string;
  startAt?: Date;
}

/**
 * Starts a subscription and returns it together with the amount owed for the
 * first period. No money moves here — the caller creates the invoice.
 */
export async function createSubscription(input: CreateSubscriptionInput) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error(`Plan not found: ${input.planId}`);

  if (input.seats < plan.minSeats) {
    throw new BelowMinimumSeatsError(plan.minSeats);
  }

  const existing = await prisma.subscription.findUnique({
    where: { tenantId: input.tenantId },
  });
  if (existing) throw new SubscriptionAlreadyExistsError();

  const pricePerSeat = assertKurus(
    input.pricePerSeatMonthly ?? plan.pricePerSeatMonthly,
    "pricePerSeatMonthly"
  );

  const start = input.startAt ?? new Date();
  const period = monthlyPeriod(start);
  const trialEndsAt =
    plan.trialDays > 0
      ? new Date(start.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

  const subscription = await prisma.$transaction(async (tx) => {
    const created = await tx.subscription.create({
      data: {
        tenantId: input.tenantId,
        planId: plan.id,
        status: plan.trialDays > 0 ? "TRIALING" : "ACTIVE",
        seats: input.seats,
        pricePerSeatMonthly: pricePerSeat,
        currency: plan.currency,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        trialEndsAt,
      },
    });

    await tx.seatChangeLog.create({
      data: {
        tenantId: input.tenantId,
        oldSeats: 0,
        newSeats: input.seats,
        changedBy: input.actorId ?? null,
        reason: "UPGRADE",
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
      tenantId: input.tenantId,
      userId: input.actorId,
      details: {
        planId: plan.id,
        seats: input.seats,
        pricePerSeatMonthly: pricePerSeat,
        periodEnd: period.end.toISOString(),
      },
    });

    return created;
  });

  return {
    subscription,
    amountDue: seatSubtotal(pricePerSeat, input.seats),
    period,
  };
}

/**
 * Cancels at the end of the paid period — access continues until then, so this
 * only records the intent.
 */
export async function cancelSubscription(tenantId: string, actorId?: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });
  if (!subscription) throw new SubscriptionNotFoundError();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({
      where: { tenantId },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELED,
      tenantId,
      userId: actorId,
      details: {
        accessUntil: subscription.currentPeriodEnd.toISOString(),
        seats: subscription.seats,
      },
    });

    return result;
  });

  return { subscription: updated, accessUntil: subscription.currentPeriodEnd };
}
