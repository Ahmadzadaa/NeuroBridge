import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  previewSeatChange,
  requestSeatChange,
  applyPendingSeats,
} from "@/lib/billing/seat-change-service";
import { createSubscription } from "@/lib/billing/subscription-service";
import { markInvoicePaid, approveManualInvoice, createInvoice } from "@/lib/billing/invoice-service";
import {
  BelowMinimumSeatsError,
  SeatChangeNotNeededError,
  SeatsBelowActiveUsersError,
} from "@/lib/billing/errors";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

const createdTenantIds: string[] = [];
const createdPlanIds: string[] = [];

async function seedTenantWithSubscription(options: {
  seats: number;
  seatsUsed?: number;
  pricePerSeat?: number;
  minSeats?: number;
  periodStart?: Date;
}) {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Billing Test Tenant",
      status: "ACTIVE",
      seatLimit: options.seats,
      seatsUsed: options.seatsUsed ?? 0,
    },
  });
  createdTenantIds.push(tenant.id);

  const plan = await prisma.plan.create({
    data: {
      name: "Test Plan",
      pricePerSeatMonthly: options.pricePerSeat ?? 2500,
      minSeats: options.minSeats ?? 1,
      trialDays: 0,
    },
  });
  createdPlanIds.push(plan.id);

  const { subscription } = await createSubscription({
    tenantId: tenant.id,
    planId: plan.id,
    seats: options.seats,
    startAt: options.periodStart ?? new Date("2026-07-01T00:00:00Z"),
  });

  return { tenant, plan, subscription };
}

afterEach(async () => {
  if (!hasTestDb) return;
  for (const tenantId of createdTenantIds.splice(0)) {
    await prisma.seatChangeLog.deleteMany({ where: { tenantId } });
    await prisma.paymentTransaction.deleteMany({
      where: { invoice: { tenantId } },
    });
    await prisma.invoice.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  }
  for (const planId of createdPlanIds.splice(0)) {
    await prisma.plan.deleteMany({ where: { id: planId } });
  }
});

describe.skipIf(!hasTestDb)("seat change service", () => {
  it("prices a mid-period increase pro rata", async () => {
    const { tenant } = await seedTenantWithSubscription({ seats: 40 });

    const preview = await previewSeatChange(
      tenant.id,
      50,
      new Date("2026-07-16T00:00:00Z")
    );

    expect(preview.direction).toBe("INCREASE");
    expect(preview.seatDelta).toBe(10);
    expect(preview.daysInPeriod).toBe(31);
    expect(preview.daysRemaining).toBe(16);
    // 2500 × 10 × 16/31 = 12903.2 -> 12903
    expect(preview.amountDue).toBe(12903);
    expect(preview.nextPeriodAmount).toBe(125000);
  });

  it("does not grant seats until the upgrade invoice is paid", async () => {
    const { tenant, subscription } = await seedTenantWithSubscription({ seats: 40 });

    const result = await requestSeatChange({
      tenantId: tenant.id,
      requestedSeats: 50,
      now: new Date("2026-07-16T00:00:00Z"),
    });

    expect(result.applied).toBe(false);
    expect(result.invoiceId).toBeDefined();

    const stillUnchanged = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(stillUnchanged?.seats).toBe(40);

    await markInvoicePaid(result.invoiceId!);

    const afterPayment = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    const tenantAfter = await prisma.tenant.findUnique({ where: { id: tenant.id } });

    expect(afterPayment?.seats).toBe(50);
    expect(tenantAfter?.seatLimit).toBe(50);
  });

  it("is idempotent when the same invoice is settled twice", async () => {
    const { tenant, subscription } = await seedTenantWithSubscription({ seats: 40 });

    const result = await requestSeatChange({
      tenantId: tenant.id,
      requestedSeats: 45,
      now: new Date("2026-07-10T00:00:00Z"),
    });

    const first = await markInvoicePaid(result.invoiceId!);
    const second = await markInvoicePaid(result.invoiceId!);

    expect(first.alreadyPaid).toBe(false);
    expect(second.alreadyPaid).toBe(true);

    const finalState = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(finalState?.seats).toBe(45);
  });

  it("defers a decrease to the end of the period without charging", async () => {
    const { tenant, subscription } = await seedTenantWithSubscription({ seats: 40 });

    const result = await requestSeatChange({
      tenantId: tenant.id,
      requestedSeats: 30,
      now: new Date("2026-07-16T00:00:00Z"),
    });

    expect(result.applied).toBe(true);
    expect(result.preview.amountDue).toBe(0);
    expect(result.invoiceId).toBeUndefined();

    const duringPeriod = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(duringPeriod?.seats).toBe(40);
    expect(duringPeriod?.pendingSeats).toBe(30);

    await applyPendingSeats(tenant.id);

    const afterRollover = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(afterRollover?.seats).toBe(30);
    expect(afterRollover?.pendingSeats).toBeNull();
  });

  it("refuses to cut seats below the users already occupying them", async () => {
    const { tenant } = await seedTenantWithSubscription({ seats: 40, seatsUsed: 35 });

    await expect(
      requestSeatChange({ tenantId: tenant.id, requestedSeats: 30 })
    ).rejects.toBeInstanceOf(SeatsBelowActiveUsersError);
  });

  it("clamps a scheduled decrease if users joined in the meantime", async () => {
    const { tenant, subscription } = await seedTenantWithSubscription({
      seats: 40,
      seatsUsed: 10,
    });

    await requestSeatChange({ tenantId: tenant.id, requestedSeats: 20 });

    // Users join after the downgrade was scheduled.
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { seatsUsed: 26 },
    });

    await applyPendingSeats(tenant.id);

    const afterRollover = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(afterRollover?.seats).toBe(26);
  });

  it("refuses to go below the plan minimum", async () => {
    const { tenant } = await seedTenantWithSubscription({ seats: 40, minSeats: 25 });

    await expect(
      requestSeatChange({ tenantId: tenant.id, requestedSeats: 10 })
    ).rejects.toBeInstanceOf(BelowMinimumSeatsError);
  });

  it("rejects a no-op change", async () => {
    const { tenant } = await seedTenantWithSubscription({ seats: 40 });

    await expect(
      requestSeatChange({ tenantId: tenant.id, requestedSeats: 40 })
    ).rejects.toBeInstanceOf(SeatChangeNotNeededError);
  });

  it("charges nothing extra when the period has already ended", async () => {
    const { tenant } = await seedTenantWithSubscription({ seats: 40 });

    const preview = await previewSeatChange(
      tenant.id,
      50,
      new Date("2026-08-01T00:00:00Z")
    );

    expect(preview.amountDue).toBe(0);
  });
});

describe.skipIf(!hasTestDb)("manual (offline) invoices", () => {
  it("grants seats only once a super admin approves", async () => {
    const { tenant, subscription } = await seedTenantWithSubscription({ seats: 40 });

    const admin = await prisma.user.create({
      data: {
        email: `super-${Date.now()}@bizsim.test`,
        passwordHash: "x",
        role: "SUPER_ADMIN",
      },
    });

    const invoice = await createInvoice({
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      amount: 25000,
      type: "SEAT_UPGRADE",
      method: "MANUAL",
      seatCount: 50,
    });

    const before = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(before?.seats).toBe(40);

    await approveManualInvoice(invoice.id, admin.id, "Bank transfer received");

    const after = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    const settled = await prisma.invoice.findUnique({ where: { id: invoice.id } });

    expect(after?.seats).toBe(50);
    expect(settled?.status).toBe("PAID");
    expect(settled?.approvedBy).toBe(admin.id);

    await prisma.user.delete({ where: { id: admin.id } });
  });
});
