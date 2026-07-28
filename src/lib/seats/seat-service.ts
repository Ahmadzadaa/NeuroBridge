import type { Prisma } from "@prisma/client";
import {
  SeatLimitReachedError,
  TenantNotActiveError,
} from "@/lib/seats/errors";
import { isPostgresDatabase } from "@/lib/db/tenant-context";

export interface LockedTenantRow {
  id: string;
  seatLimit: number;
  seatsUsed: number;
  status: string;
}

export async function lockTenantForUpdate(
  tx: Prisma.TransactionClient,
  tenantId: string
): Promise<LockedTenantRow> {
  if (isPostgresDatabase()) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        seat_limit: number;
        seats_used: number;
        status: string;
      }>
    >`
      SELECT id, seat_limit, seats_used, status
      FROM tenants
      WHERE id = ${tenantId}
      FOR UPDATE
    `;

    const row = rows[0];
    if (!row) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return {
      id: row.id,
      seatLimit: row.seat_limit,
      seatsUsed: row.seats_used,
      status: row.status,
    };
  }

  // SQLite (local dev) has no row-level locking; the surrounding
  // transaction already serializes writes, so a plain read is enough.
  const row = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, seatLimit: true, seatsUsed: true, status: true },
  });

  if (!row) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  return row;
}

export async function consumeSeat(
  tx: Prisma.TransactionClient,
  tenantId: string
): Promise<{ seatsUsed: number; seatLimit: number }> {
  const tenant = await lockTenantForUpdate(tx, tenantId);

  if (tenant.status !== "ACTIVE") {
    throw new TenantNotActiveError();
  }

  if (tenant.seatsUsed >= tenant.seatLimit) {
    throw new SeatLimitReachedError();
  }

  const updated = await tx.tenant.update({
    where: { id: tenantId },
    data: { seatsUsed: { increment: 1 } },
    select: { seatsUsed: true, seatLimit: true },
  });

  return {
    seatsUsed: updated.seatsUsed,
    seatLimit: updated.seatLimit,
  };
}

export async function addSeatsFromPayment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  seatCount: number,
  options?: { activateTenant?: boolean }
): Promise<{ previousLimit: number; newLimit: number }> {
  const tenant = await lockTenantForUpdate(tx, tenantId);
  const previousLimit = tenant.seatLimit;
  const newLimit = previousLimit + seatCount;

  await tx.tenant.update({
    where: { id: tenantId },
    data: {
      seatLimit: newLimit,
      planType: String(newLimit),
      ...(options?.activateTenant && tenant.status === "PENDING"
        ? { status: "ACTIVE" }
        : {}),
    },
  });

  return { previousLimit, newLimit };
}

export async function removeSeatsFromRefund(
  tx: Prisma.TransactionClient,
  tenantId: string,
  seatCount: number
): Promise<{ previousLimit: number; newLimit: number }> {
  const tenant = await lockTenantForUpdate(tx, tenantId);
  const previousLimit = tenant.seatLimit;
  const newLimit = Math.max(tenant.seatsUsed, previousLimit - seatCount);

  await tx.tenant.update({
    where: { id: tenantId },
    data: { seatLimit: newLimit },
  });

  return { previousLimit, newLimit };
}

export async function getTenantSeatSnapshot(tenantId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      seatLimit: true,
      seatsUsed: true,
      status: true,
      planType: true,
    },
  });
}
