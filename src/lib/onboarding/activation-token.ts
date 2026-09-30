import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * One-time set-password links for newly provisioned admins.
 *
 * Only the SHA-256 of the token is stored, so a database leak does not leak
 * usable links. Plaintext passwords are never generated, stored or emailed.
 */

export const ACTIVATION_TTL_MS = 48 * 60 * 60 * 1000;

export type ActivationTokenState = "VALID" | "INVALID" | "EXPIRED" | "USED";

export class ActivationError extends Error {
  constructor(public readonly state: Exclude<ActivationTokenState, "VALID">) {
    super(`Activation token ${state.toLowerCase()}`);
    this.name = "ActivationError";
  }
}

export function hashActivationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A hash no password will match, for accounts that must activate first. */
export async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), 12);
}

export async function createActivationToken(
  userId: string,
  db: Prisma.TransactionClient = prisma,
  now = new Date()
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ACTIVATION_TTL_MS);
  await db.activationToken.create({
    data: { userId, tokenHash: hashActivationToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function getActivationTokenState(
  token: string,
  now = new Date()
): Promise<ActivationTokenState> {
  const row = await prisma.activationToken.findUnique({
    where: { tokenHash: hashActivationToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  if (!row) return "INVALID";
  if (row.usedAt) return "USED";
  if (row.expiresAt <= now) return "EXPIRED";
  return "VALID";
}

/**
 * Sets the password and burns the token. The conditional update means two
 * concurrent submissions of the same link can never both succeed.
 */
export async function activateAccount(
  token: string,
  password: string,
  now = new Date()
): Promise<{ userId: string }> {
  const tokenHash = hashActivationToken(token);
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const row = await tx.activationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });
    if (!row) throw new ActivationError("INVALID");
    if (row.usedAt) throw new ActivationError("USED");
    if (row.expiresAt <= now) throw new ActivationError("EXPIRED");

    const burned = await tx.activationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (burned.count !== 1) throw new ActivationError("USED");

    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });

    return { userId: row.userId };
  });
}
