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
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

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

const LOCKOUT_THRESHOLD = 5;
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

        if (request instanceof Request) {
          await enforceRateLimit("login", getClientIdentifier(request));
        }

        const { email, password, totpCode } = parsed.data;
        const recoveryCode = (credentials?.recoveryCode as string | undefined)?.trim();

        const user = await prisma.user.findFirst({
          where: { email: email.toLowerCase() },
          include: {
            tenant: { select: { status: true } },
            recoveryCodes: { where: { usedAt: null } },
          },
        });

        if (!user) {
          await recordAudit({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            ip,
            details: { email, reason: "unknown_user" },
          });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await recordAudit({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            userId: user.id,
            tenantId: user.tenantId,
            ip,
            details: { reason: "account_locked" },
          });
          return null;
        }

        if (user.role !== "SUPER_ADMIN") {
          if (!user.tenant || user.tenant.status !== "ACTIVE") {
            await recordAudit({
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
          await recordAudit({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            userId: user.id,
            tenantId: user.tenantId,
            ip,
            details: { reason: "invalid_password" },
          });
          return null;
        }

        const role = user.role as UserRole;
        const needs2FASetup = adminRequires2FA(role) && !user.twoFactorEnabled;
        let twoFactorVerified = !adminRequires2FA(role);

        if (user.twoFactorEnabled && user.twoFactorSecret) {
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
            await recordAudit({
              action: AUDIT_ACTIONS.LOGIN_FAILED,
              userId: user.id,
              tenantId: user.tenantId,
              ip,
              details: { reason: "invalid_2fa" },
            });
            return null;
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
      await recordAudit({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        userId: user.id,
        tenantId: user.tenantId ?? null,
        details: { email: user.email },
      });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        await recordAudit({
          action: AUDIT_ACTIONS.LOGOUT,
          userId: token.id as string,
          tenantId: (token.tenantId as string | null) ?? null,
        });
      }
    },
  },
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
