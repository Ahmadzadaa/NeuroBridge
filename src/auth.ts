import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/lib/types";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { authorizeCredentials } from "@/lib/auth/authorize-credentials";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
      },
      authorize: (credentials, request) =>
        authorizeCredentials(credentials, request),
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
    case "JURY":
      return `/${locale}/jury`;
    default:
      return `/${locale}/login`;
  }
}
