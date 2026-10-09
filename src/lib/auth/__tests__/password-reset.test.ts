import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, updateMany, sendEmail, createActivationToken } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  sendEmail: vi.fn(),
  createActivationToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst },
    $transaction: (fn: (tx: unknown) => unknown) => fn({ activationToken: { updateMany } }),
  },
}));
vi.mock("@/lib/email/email-service", () => ({ sendEmail }));
vi.mock("@/lib/onboarding/activation-token", () => ({ createActivationToken, PASSWORD_RESET_TTL_MS: 3_600_000 }));

import { requestPasswordReset } from "@/lib/auth/password-reset";

const request = { email: "Ada@Example.com ", locale: "az", origin: "https://bizsim.test" };

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createActivationToken.mockResolvedValue({ token: "tok123", expiresAt: new Date() });
    sendEmail.mockResolvedValue({ sent: true, provider: "console" });
  });

  it("sends nothing for an unknown address", async () => {
    findFirst.mockResolvedValue(null);
    await requestPasswordReset(request);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing to a member of a suspended organisation", async () => {
    findFirst.mockResolvedValue({ id: "u1", role: "PARTICIPANT", language: "az", tenant: { status: "SUSPENDED" } });
    await requestPasswordReset(request);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("burns older links and emails a one-hour reset link", async () => {
    findFirst.mockResolvedValue({ id: "u1", role: "PARTICIPANT", language: "en", tenant: { status: "ACTIVE" } });
    await requestPasswordReset(request);

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "ada@example.com" } }));
    expect(updateMany).toHaveBeenCalledWith({ where: { userId: "u1", usedAt: null }, data: { usedAt: expect.any(Date) } });
    expect(createActivationToken).toHaveBeenCalledWith("u1", expect.anything(), expect.any(Date), 3_600_000);
    const message = sendEmail.mock.calls[0][0];
    expect(message.html).toContain("https://bizsim.test/az/reset-password/tok123");
  });
});
