import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/types";
import {
  adminRequires2FA,
  decryptSecret,
  verifyRecoveryCode,
  verifyTotpCode,
} from "@/lib/security/two-factor";
import { loginSchema, recoveryCodeSchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/auth/permissions";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  AccountLockedError,
  TwoFactorRequiredError,
} from "@/lib/auth/credentials-errors";
import { isDemoDevBypass } from "@/lib/security/demo-bypass";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  language: string;
  twoFactorVerified: boolean;
  requires2FASetup: boolean;
}

export type LoginCredentials = Partial<
  Record<"email" | "password" | "totpCode" | "recoveryCode", unknown>
>;

async function recordLoginAudit(
  input: Parameters<typeof recordAudit>[0]
): Promise<void> {
  try {
    await recordAudit(input);
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

/**
 * Credentials authorization used by the NextAuth provider in `src/auth.ts`.
 * Extracted so the login flow (rate limiting, lockout, 2FA) is unit-testable.
 */
export async function authorizeCredentials(
  credentials: LoginCredentials | undefined,
  request: unknown
): Promise<AuthorizedUser | null> {
  const parsed = loginSchema.safeParse({
    email: credentials?.email,
    password: credentials?.password,
    totpCode: credentials?.totpCode || undefined,
  });

  if (!parsed.success) return null;

  const ip = request instanceof Request ? getClientIp(request) : "unknown";

  const { email, password, totpCode } = parsed.data;
  // Validate format before the expensive bcrypt comparison loop —
  // recovery codes are always 10 hex characters.
  const recoveryCodeParsed = recoveryCodeSchema.safeParse(
    credentials?.recoveryCode
  );
  const recoveryCode = recoveryCodeParsed.success
    ? recoveryCodeParsed.data
    : undefined;

  if (request instanceof Request) {
    try {
      // Limit per account (brute force on one user) AND per IP
      // (credential spraying across many accounts from one source).
      await enforceRateLimit("login", email.toLowerCase());
      if (ip !== "unknown") {
        await enforceRateLimit("login", `ip:${ip}`);
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        return null;
      }
      throw error;
    }
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    include: {
      tenant: { select: { status: true } },
      recoveryCodes: { where: { usedAt: null } },
    },
  });

  if (!user) {
    await recordLoginAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      ip,
      details: { email, reason: "unknown_user" },
    });
    return null;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLoginAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      userId: user.id,
      tenantId: user.tenantId,
      ip,
      details: { reason: "account_locked" },
    });
    throw new AccountLockedError();
  }

  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenant || user.tenant.status !== "ACTIVE") {
      await recordLoginAudit({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        userId: user.id,
        tenantId: user.tenantId,
        ip,
        details: { reason: "tenant_inactive" },
      });
      return null;
    }
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: user.failedLoginAttempts + 1,
        lockedUntil:
          user.failedLoginAttempts + 1 >= LOCKOUT_THRESHOLD
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : null,
      },
    });
    await recordLoginAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      userId: user.id,
      tenantId: user.tenantId,
      ip,
      details: { reason: "invalid_password" },
    });
    return null;
  }

  const role = user.role as UserRole;
  const demoBypass = isDemoDevBypass(email);
  const needs2FASetup =
    !demoBypass && adminRequires2FA(role) && !user.twoFactorEnabled;
  let twoFactorVerified = !adminRequires2FA(role) || demoBypass;

  if (user.twoFactorEnabled && user.twoFactorSecret && !demoBypass) {
    twoFactorVerified = false;
    const secret = decryptSecret(user.twoFactorSecret);

    if (totpCode && verifyTotpCode(secret, totpCode)) {
      twoFactorVerified = true;
    } else if (recoveryCode) {
      for (const rc of user.recoveryCodes) {
        const match = await verifyRecoveryCode(recoveryCode, rc.codeHash);
        if (match) {
          await prisma.userRecoveryCode.update({
            where: { id: rc.id },
            data: { usedAt: new Date() },
          });
          twoFactorVerified = true;
          break;
        }
      }
    }

    if (!twoFactorVerified) {
      await recordLoginAudit({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        userId: user.id,
        tenantId: user.tenantId,
        ip,
        details: { reason: "invalid_2fa" },
      });
      throw new TwoFactorRequiredError();
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  return {
    id: user.id,
    email: user.email,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    role,
    tenantId: user.tenantId,
    language: user.language,
    twoFactorVerified,
    requires2FASetup: needs2FASetup,
  };
}
