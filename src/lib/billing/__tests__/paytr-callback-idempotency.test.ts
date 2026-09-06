import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";

/**
 * Idempotency of the PayTR notification.
 *
 * PayTR retries until it is answered with "OK", so the same notification will
 * arrive more than once — sometimes concurrently. Granting seats twice for one
 * payment is the failure being prevented here, and it is not one a customer
 * would report.
 *
 * The claim is taken by inserting into `webhook_events`, whose unique index on
 * (provider, external_event_id) is what actually serialises two deliveries:
 * both attempt the insert, exactly one wins, whatever the isolation level.
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    paymentTransaction: { create: vi.fn(), count: vi.fn() },
    paymentMethod: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/billing/invoice-service", () => ({
  findInvoiceByMerchantOid: vi.fn(),
  markInvoicePaid: vi.fn(),
  markInvoiceFailed: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  findInvoiceByMerchantOid,
  markInvoiceFailed,
  markInvoicePaid,
} from "@/lib/billing/invoice-service";
import { processPaytrCallback } from "@/lib/billing/callback-service";

const MERCHANT_OID = "BIZten1abc123";

const PAYLOAD: PaytrCallbackPayload = {
  merchant_oid: MERCHANT_OID,
  status: "success",
  total_amount: "250000",
  hash: "irrelevant-here-the-hash-is-checked-in-the-route",
};

const INVOICE = {
  id: "inv1",
  tenantId: "ten1",
  amount: 250000,
} as never;

/** Prisma's unique-constraint error shape. */
function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

function webhookRow(status: string, ageMs = 0) {
  return {
    id: "wh1",
    provider: "PAYTR",
    externalEventId: MERCHANT_OID,
    status,
    createdAt: new Date(Date.now() - ageMs),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findInvoiceByMerchantOid).mockResolvedValue(INVOICE);
  vi.mocked(markInvoicePaid).mockResolvedValue({ seatsApplied: true } as never);
  vi.mocked(prisma.paymentTransaction.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.paymentTransaction.create).mockResolvedValue({} as never);
  vi.mocked(prisma.paymentMethod.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.webhookEvent.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.webhookEvent.update).mockResolvedValue({} as never);
});

describe("processPaytrCallback idempotency", () => {
  it("processes the first delivery and applies the payment", async () => {
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({} as never);

    const result = await processPaytrCallback(PAYLOAD);

    expect(result).toMatchObject({ handled: true, duplicate: false, seatsApplied: true });
    expect(markInvoicePaid).toHaveBeenCalledWith("inv1");
  });

  it("ignores a redelivery of an already-processed notification", async () => {
    vi.mocked(prisma.webhookEvent.create).mockRejectedValue(uniqueViolation());
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(
      webhookRow("PROCESSED")
    );

    const result = await processPaytrCallback(PAYLOAD);

    expect(result).toEqual({ handled: true, duplicate: true });
    // The point of the whole exercise: no second seat grant.
    expect(markInvoicePaid).not.toHaveBeenCalled();
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("stands aside while another delivery is mid-flight", async () => {
    vi.mocked(prisma.webhookEvent.create).mockRejectedValue(uniqueViolation());
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(
      webhookRow("PROCESSING", 1000)
    );

    const result = await processPaytrCallback(PAYLOAD);

    expect(result).toMatchObject({ inFlight: true, handled: false });
    expect(markInvoicePaid).not.toHaveBeenCalled();
  });

  it("retakes a claim left behind by a process that died holding it", async () => {
    vi.mocked(prisma.webhookEvent.create).mockRejectedValue(uniqueViolation());
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(
      // Older than the claim expiry: nothing is still working on this.
      webhookRow("PROCESSING", 10 * 60 * 1000)
    );

    const result = await processPaytrCallback(PAYLOAD);

    expect(result).toMatchObject({ handled: true, duplicate: false });
    expect(markInvoicePaid).toHaveBeenCalledWith("inv1");
  });

  it("retries a delivery whose previous attempt failed", async () => {
    vi.mocked(prisma.webhookEvent.create).mockRejectedValue(uniqueViolation());
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(webhookRow("FAILED"));

    const result = await processPaytrCallback(PAYLOAD);

    expect(result).toMatchObject({ handled: true, duplicate: false });
  });

  it("releases the claim when the order is not ours, so a later retry can land", async () => {
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({} as never);
    vi.mocked(findInvoiceByMerchantOid).mockResolvedValue(null as never);

    await expect(processPaytrCallback(PAYLOAD)).rejects.toThrow(
      /No invoice for merchant_oid/
    );

    // Without this the redelivery that arrives once the invoice exists would be
    // turned away as in-flight and the payment would never be applied.
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });

  it("records a declined payment without granting seats", async () => {
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({} as never);
    vi.mocked(markInvoiceFailed).mockResolvedValue({} as never);

    const result = await processPaytrCallback({
      ...PAYLOAD,
      status: "failed",
      failed_reason_msg: "Insufficient funds",
    });

    expect(result).toMatchObject({ handled: true, duplicate: false });
    expect(markInvoiceFailed).toHaveBeenCalledWith("inv1", "Insufficient funds");
    expect(markInvoicePaid).not.toHaveBeenCalled();
  });

  it("does not swallow an unexpected database error while claiming", async () => {
    vi.mocked(prisma.webhookEvent.create).mockRejectedValue(
      new Error("connection terminated")
    );

    await expect(processPaytrCallback(PAYLOAD)).rejects.toThrow(
      /connection terminated/
    );
  });
});
