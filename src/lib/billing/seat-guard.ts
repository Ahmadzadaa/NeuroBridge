import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@/lib/types";
import { grantsWriteAccess } from "@/lib/billing/subscription-service";
import {
  SeatLimitExceededError,
  SubscriptionExpiredError,
} from "@/lib/billing/errors";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Seat and subscription enforcement.
 *
 * Call these before anything that consumes a seat (inviting or activating a
 * user) or that writes tenant data. Tenants without a subscription are allowed
 * through: billing arrived after these organisations did, and they must not be
 * locked out retroactively.
 */

export interface SeatAvailability {
  seatLimit: number;
  seatsUsed: number;
  seatsAvailable: number;
}

export async function getSeatAvailability(
  tenantId: string,
  db: Db = prisma
): Promise<SeatAvailability> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { seatLimit: true, seatsUsed: true },
  });

  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  return {
    seatLimit: tenant.seatLimit,
    seatsUsed: tenant.seatsUsed,
    seatsAvailable: Math.max(0, tenant.seatLimit - tenant.seatsUsed),
  };
}

/**
 * Throws 402 SEAT_LIMIT_EXCEEDED when no seat is free.
 *
 * `count` is how many seats the caller is about to consume, so a bulk invite
 * of 10 people fails up front instead of half-succeeding.
 */
export async function assertSeatAvailable(
  tenantId: string,
  count = 1,
  db: Db = prisma
): Promise<SeatAvailability> {
  const availability = await getSeatAvailability(tenantId, db);

  if (availability.seatsUsed + count > availability.seatLimit) {
    throw new SeatLimitExceededError(
      availability.seatsUsed,
      availability.seatLimit
    );
  }

  return availability;
}

/**
 * Throws 402 SUBSCRIPTION_EXPIRED when the tenant has lapsed into read-only.
 * Data is never deleted — only writes are refused.
 */
export async function assertTenantCanWrite(
  tenantId: string,
  db: Db = prisma
): Promise<void> {
  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    select: { status: true },
  });

  if (!subscription) return;

  if (!grantsWriteAccess(subscription.status as SubscriptionStatus)) {
    throw new SubscriptionExpiredError();
  }
}

/** Both checks in the order a user-invite flow needs them. */
export async function assertCanAddUsers(
  tenantId: string,
  count = 1,
  db: Db = prisma
): Promise<SeatAvailability> {
  await assertTenantCanWrite(tenantId, db);
  return assertSeatAvailable(tenantId, count, db);
}
