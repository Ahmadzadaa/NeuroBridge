import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/email-service";
import { activationEmail } from "@/lib/email/templates";
import { createActivationToken } from "@/lib/onboarding/activation-token";

/**
 * A fresh set-password link for an organisation admin who has not activated
 * their account yet: the first email may never have arrived (no mail service
 * configured, a spam filter, a 48-hour link that ran out). The platform team
 * can copy the link and pass it on, and it is emailed again where possible.
 */
export class ActivationLinkError extends Error {
  constructor(
    readonly code: "TENANT_NOT_FOUND" | "NO_ADMIN" | "ALREADY_ACTIVE",
    readonly statusCode: number
  ) {
    super(code);
    this.name = "ActivationLinkError";
  }
}

/** Waiting to activate: was sent a link and has not used one. Seeded accounts with a password have no links at all. */
export const awaitsActivation = (tokens: { usedAt: Date | null }[]) => tokens.length > 0 && tokens.every((t) => t.usedAt === null);

export async function issueActivationLink(tenantId: string, origin: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      users: {
        where: { role: "TENANT_ADMIN" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, email: true, language: true, activationTokens: { select: { usedAt: true } } },
      },
    },
  });
  if (!tenant) throw new ActivationLinkError("TENANT_NOT_FOUND", 404);
  const admin = tenant.users[0];
  if (!admin) throw new ActivationLinkError("NO_ADMIN", 404);
  // An active account resets its password itself; handing out a takeover link here would bypass that.
  if (!awaitsActivation(admin.activationTokens)) throw new ActivationLinkError("ALREADY_ACTIVE", 409);

  // Older unused links go: only the newest one should work.
  await prisma.activationToken.deleteMany({ where: { userId: admin.id, usedAt: null } });
  const { token, expiresAt } = await createActivationToken(admin.id);
  const url = localeUrl(origin, `/activate/${token}`, admin.language);

  const sent = await sendEmail({
    to: admin.email,
    ...activationEmail({ organizationName: tenant.name, activationUrl: url, locale: admin.language }),
  }).catch(() => ({ sent: false }));

  return { url, email: admin.email, emailed: sent.sent, expiresAt: expiresAt.toISOString() };
}
