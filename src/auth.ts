import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/types";
import {
  adminRequires2FA,
  decryptSecret,
  verifyRecoveryCode,
  verifyTotpCode,
} from "@/lib/security/two-factor";
import { loginSchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/auth/permissions";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  AccountLockedError,
  TwoFactorRequiredError,
} from "@/lib/auth/credentials-errors";

const DEMO_ACCOUNT_EMAILS = new Set([
  "admin@bizsim.com",
  "tenant@demo-tekno.com",
  "participant@demo.com",
]);

function isDemoDevBypass(email: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.BYPASS_DEMO_2FA !== "false" &&
    DEMO_ACCOUNT_EMAILS.has(email.toLowerCase())
  );
}

declare module "next-auth" {
  interface User {
    role: UserRole;
    tenantId: string | null;
    language: string;
    twoFactorVerified: boolean;
    requires2FASetup: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      tenantId: string | null;
      language: string;
      twoFactorVerified: boolean;
      requires2FASetup: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string | null;
    language: string;
    twoFactorVerified: boolean;
    requires2FASetup: boolean;
  }
}

async function recordLoginAudit(
  input: Parameters<typeof recordAudit>[0]
): Promise<void> {
  try {
    await recordAudit(input);
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          totpCode: credentials?.totpCode || undefined,
        });

        if (!parsed.success) return null;

        const ip =
          request instanceof Request ? getClientIp(request) : "unknown";

        const { email, password, totpCode } = parsed.data;
        const recoveryCode = (credentials?.recoveryCode as string | undefined)?.trim();

        if (request instanceof Request) {
          try {
            await enforceRateLimit("login", email.toLowerCase());
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
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
          role,
          tenantId: user.tenantId,
          language: user.language,
          twoFactorVerified,
          requires2FASetup: needs2FASetup,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.language = user.language;
        token.twoFactorVerified = user.twoFactorVerified;
        token.requires2FASetup = user.requires2FASetup;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      session.user.language = token.language;
      session.user.twoFactorVerified = token.twoFactorVerified;
      session.user.requires2FASetup = token.requires2FASetup;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        await recordAudit({
          action: AUDIT_ACTIONS.LOGIN_SUCCESS,
          userId: user.id,
          tenantId: user.tenantId ?? null,
          details: { email: user.email },
        });
      } catch (error) {
        console.error("Login audit write failed:", error);
      }
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        try {
          await recordAudit({
            action: AUDIT_ACTIONS.LOGOUT,
            userId: token.id as string,
            tenantId: (token.tenantId as string | null) ?? null,
          });
        } catch (error) {
          console.error("Logout audit write failed:", error);
        }
      }
    },
  },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
});

export function getRoleDashboardPath(role: UserRole, locale: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return `/${locale}/super-admin`;
    case "TENANT_ADMIN":
    case "TENANT_VIEWER":
      return `/${locale}/tenant`;
    case "PARTICIPANT":
      return `/${locale}/participant`;
    default:
      return `/${locale}/login`;
  }
}
