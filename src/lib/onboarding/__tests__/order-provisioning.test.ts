import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const tx = {
    order: { updateMany: vi.fn(), update: vi.fn() },
    tenant: { create: vi.fn() },
    user: { create: vi.fn() },
    activationToken: { create: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    prisma: {
      order: { findUnique: vi.fn(), updateMany: vi.fn() },
      user: { findFirst: vi.fn() },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/lib/email/email-service", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/audit/audit-service", () => ({ recordAudit: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import {
  processOrderCallback,
  resendOrderActivation,
  UnknownOrderError,
} from "@/lib/onboarding/order-provisioning";
import { hashActivationToken } from "@/lib/onboarding/activation-token";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";

type Mock = ReturnType<typeof vi.fn>;
const tx = (prisma as unknown as { __tx: Record<string, Record<string, Mock>> }).__tx;
const findOrder = prisma.order.findUnique as unknown as Mock;
const failOrder = prisma.order.updateMany as unknown as Mock;

const order = {
  id: "ord_1",
  institutionName: "Test <University>",
  contactName: "Ayla Nur Test",
  contactEmail: "admin@uni.test",
  locale: "az",
  status: "PENDING",
  total: 120_000,
  currency: "TRY",
  paytrMerchantOid: "ORDabc123",
  tenantId: null,
  items: [
    { serviceId: "svc_hack", participantCount: 60, service: { code: "HACKATHON" } },
    { serviceId: "svc_teach", participantCount: 40, service: { code: "TEACHERS" } },
  ],
};

const payload = (overrides: Partial<PaytrCallbackPayload> = {}): PaytrCallbackPayload => ({
  merchant_oid: "ORDabc123",
  status: "success",
  total_amount: "120000",
  hash: "verified-upstream",
  ...overrides,
});

describe("processOrderCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOrder.mockResolvedValue(order);
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.tenant.create.mockResolvedValue({ id: "ten_1" });
    tx.user.create.mockResolvedValue({ id: "usr_1" });
    vi.mocked(sendEmail).mockResolvedValue({ sent: true, provider: "console" });
  });

  it("provisions the tenant, services, admin and a hashed activation token", async () => {
    const result = await processOrderCallback(payload(), "https://app.test");

    expect(result).toEqual({ outcome: "PROVISIONED", orderId: "ord_1", tenantId: "ten_1", emailSent: true });

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord_1", status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PAID", paidAt: expect.any(Date) },
    });

    const tenant = tx.tenant.create.mock.calls[0][0].data;
    expect(tenant).toMatchObject({
      name: "Test <University>",
      status: "ACTIVE",
      seatLimit: 60,
      tenantType: "FULL",
      hackathonEnabled: true,
      teachersEnabled: true,
      simulationsEnabled: false,
      trainingsEnabled: false,
      aiToolsEnabled: false,
    });
    expect(tenant.services.create).toEqual([
      { serviceId: "svc_hack", participantLimit: 60 },
      { serviceId: "svc_teach", participantLimit: 40 },
    ]);

    expect(tx.user.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "ten_1",
      email: "admin@uni.test",
      firstName: "Ayla",
      lastName: "Nur Test",
      role: "TENANT_ADMIN",
      language: "az",
    });
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "ord_1" }, data: { tenantId: "ten_1" } });

    // The email carries the raw token; only its hash is stored.
    const { tokenHash, expiresAt } = tx.activationToken.create.mock.calls[0][0].data;
    const { html, to } = vi.mocked(sendEmail).mock.calls[0][0];
    const token = /\/az\/activate\/([A-Za-z0-9_-]+)/.exec(html)![1];
    expect(to).toBe("admin@uni.test");
    expect(tokenHash).toBe(hashActivationToken(token));
    expect(tokenHash).not.toBe(token);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(47 * 3600_000);
    expect(html).toContain("Test &lt;University&gt;");
    expect(html).not.toMatch(/şifrə:\s*<code/i);
  });

  it("does nothing for an order that is already PAID", async () => {
    findOrder.mockResolvedValue({ ...order, status: "PAID" });

    const result = await processOrderCallback(payload());

    expect(result).toEqual({ outcome: "DUPLICATE", orderId: "ord_1" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does nothing when a concurrent callback already claimed the order", async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await processOrderCallback(payload());

    expect(result).toEqual({ outcome: "DUPLICATE", orderId: "ord_1" });
    expect(tx.tenant.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("marks a failed payment FAILED and creates no tenant", async () => {
    const result = await processOrderCallback(payload({ status: "failed" }));

    expect(result).toEqual({ outcome: "FAILED", orderId: "ord_1" });
    expect(failOrder).toHaveBeenCalledWith({
      where: { id: "ord_1", status: "PENDING" },
      data: { status: "FAILED" },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to provision when PayTR reports less than the order total", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await processOrderCallback(payload({ total_amount: "100" }));

    expect(result.outcome).toBe("FAILED");
    expect(tx.tenant.create).not.toHaveBeenCalled();
  });

  it("still reports the tenant as provisioned when the email fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(sendEmail).mockRejectedValue(new Error("SES down"));

    const result = await processOrderCallback(payload());

    expect(result).toMatchObject({ outcome: "PROVISIONED", emailSent: false });
  });

  it("throws for an unknown merchant_oid so PayTR retries", async () => {
    findOrder.mockResolvedValue(null);

    await expect(processOrderCallback(payload())).rejects.toBeInstanceOf(UnknownOrderError);
  });
});

describe("resendOrderActivation", () => {
  const findAdmin = prisma.user.findFirst as unknown as Mock;
  const paid = { ...order, status: "PAID", tenantId: "ten_1" };

  beforeEach(() => {
    vi.clearAllMocks();
    findOrder.mockResolvedValue(paid);
    findAdmin.mockResolvedValue({ id: "usr_1", activationTokens: [] });
    vi.mocked(sendEmail).mockResolvedValue({ sent: true, provider: "console" });
  });

  it("expires older links and emails a fresh one", async () => {
    await expect(resendOrderActivation("ord_1", "https://app.test")).resolves.toEqual({ emailSent: true });

    // Revoked by expiry, not usedAt — usedAt means the password was set.
    const revoke = tx.activationToken.updateMany.mock.calls[0][0];
    expect(revoke.where).toMatchObject({ userId: "usr_1", usedAt: null });
    expect(revoke.data).toEqual({ expiresAt: expect.any(Date) });

    const { tokenHash } = tx.activationToken.create.mock.calls[0][0].data;
    const token = /\/az\/activate\/([A-Za-z0-9_-]+)/.exec(vi.mocked(sendEmail).mock.calls[0][0].html)![1];
    expect(tokenHash).toBe(hashActivationToken(token));
  });

  it("refuses when the admin already set a password", async () => {
    findAdmin.mockResolvedValue({ id: "usr_1", activationTokens: [{ id: "tok_used" }] });

    await expect(resendOrderActivation("ord_1")).rejects.toMatchObject({ code: "ALREADY_ACTIVATED", statusCode: 409 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses for an order that was never provisioned", async () => {
    findOrder.mockResolvedValue({ ...order, status: "FAILED" });

    await expect(resendOrderActivation("ord_1")).rejects.toMatchObject({ code: "NOT_PROVISIONED" });
  });
});
