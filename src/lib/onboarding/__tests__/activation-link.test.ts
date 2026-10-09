import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  activationToken: { deleteMany: vi.fn(), create: vi.fn() },
}));
const mail = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email/email-service", () => mail);

import { awaitsActivation, issueActivationLink } from "@/lib/onboarding/activation-link";

const tenantWith = (tokens: { usedAt: Date | null }[]) => ({
  name: "Demo Teknopark",
  users: [{ id: "u1", email: "admin@example.com", language: "az", activationTokens: tokens }],
});

describe("activation links for organisation admins", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tells a pending account from an active one", () => {
    expect(awaitsActivation([{ usedAt: null }])).toBe(true);
    expect(awaitsActivation([{ usedAt: null }, { usedAt: new Date() }])).toBe(false);
    // Seeded accounts with a password never had a link.
    expect(awaitsActivation([])).toBe(false);
  });

  it("replaces old links with a new one and still returns it when mail fails", async () => {
    db.tenant.findUnique.mockResolvedValue(tenantWith([{ usedAt: null }]));
    mail.sendEmail.mockResolvedValue({ sent: false, provider: "console" });
    const result = await issueActivationLink("t1", "https://app.example.com");
    expect(db.activationToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", usedAt: null } });
    expect(db.activationToken.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ email: "admin@example.com", emailed: false });
    expect(result.url).toMatch(/^https:\/\/app\.example\.com\/az\/activate\/[\w-]+$/);
  });

  it("never hands out a link for an account that is already active", async () => {
    db.tenant.findUnique.mockResolvedValue(tenantWith([{ usedAt: new Date() }]));
    await expect(issueActivationLink("t1", "https://app.example.com")).rejects.toMatchObject({ code: "ALREADY_ACTIVE", statusCode: 409 });
    expect(db.activationToken.create).not.toHaveBeenCalled();
  });
});
