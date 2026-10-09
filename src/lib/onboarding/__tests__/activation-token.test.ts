import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => {
  const tx = {
    activationToken: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { update: vi.fn() },
  };
  return {
    prisma: {
      activationToken: { findUnique: vi.fn(), create: vi.fn() },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

import { prisma } from "@/lib/prisma";
import {
  activateAccount,
  ActivationError,
  createActivationToken,
  getActivationTokenState,
  hashActivationToken,
} from "@/lib/onboarding/activation-token";

type Mock = ReturnType<typeof vi.fn>;
const tx = (prisma as unknown as { __tx: Record<string, Record<string, Mock>> }).__tx;
const NOW = new Date("2026-09-30T12:00:00Z");
const HOUR = 3600_000;

const row = (overrides: Partial<{ usedAt: Date | null; expiresAt: Date }> = {}) => ({
  id: "tok_1",
  userId: "usr_1",
  usedAt: null,
  expiresAt: new Date(NOW.getTime() + HOUR),
  ...overrides,
});

async function expectActivationError(promise: Promise<unknown>, state: string) {
  await expect(promise).rejects.toBeInstanceOf(ActivationError);
  await expect(promise).rejects.toMatchObject({ state });
}

describe("activation tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.activationToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it("stores only a SHA-256 hash and expires after 48 hours", async () => {
    const { token, expiresAt } = await createActivationToken("usr_1", undefined, NOW);

    const { data } = vi.mocked(prisma.activationToken.create).mock.calls[0][0];
    expect(data.tokenHash).toBe(hashActivationToken(token));
    expect(data.tokenHash).not.toContain(token);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(48 * HOUR);
  });

  it.each([
    [null, "INVALID"],
    [row(), "VALID"],
    [row({ usedAt: NOW }), "USED"],
    [row({ expiresAt: new Date(NOW.getTime() - 1) }), "EXPIRED"],
  ])("reports token state %#", async (found, state) => {
    vi.mocked(prisma.activationToken.findUnique).mockResolvedValue(found as never);
    expect(await getActivationTokenState("tok", NOW)).toBe(state);
  });

  it("sets a bcrypt password and burns the token", async () => {
    tx.activationToken.findUnique.mockResolvedValue(row());

    await expect(activateAccount("tok", "Secret123", NOW)).resolves.toEqual({ userId: "usr_1" });

    expect(tx.activationToken.updateMany).toHaveBeenCalledWith({
      where: { id: "tok_1", usedAt: null },
      data: { usedAt: NOW },
    });
    const { data } = tx.user.update.mock.calls[0][0];
    expect(await bcrypt.compare("Secret123", data.passwordHash)).toBe(true);
  });

  it("rejects an expired token", async () => {
    tx.activationToken.findUnique.mockResolvedValue(row({ expiresAt: new Date(NOW.getTime() - 1) }));

    await expectActivationError(activateAccount("tok", "Secret123", NOW), "EXPIRED");
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("rejects a token that was already used", async () => {
    tx.activationToken.findUnique.mockResolvedValue(row({ usedAt: new Date(NOW.getTime() - HOUR) }));

    await expectActivationError(activateAccount("tok", "Secret123", NOW), "USED");
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("lets only one of two concurrent submissions win", async () => {
    tx.activationToken.findUnique.mockResolvedValue(row());
    tx.activationToken.updateMany.mockResolvedValue({ count: 0 });

    await expectActivationError(activateAccount("tok", "Secret123", NOW), "USED");
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    tx.activationToken.findUnique.mockResolvedValue(null);

    await expectActivationError(activateAccount("nope", "Secret123", NOW), "INVALID");
  });
});
