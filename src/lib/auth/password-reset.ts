import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/email-service";
import { passwordResetEmail } from "@/lib/email/templates";
import { createActivationToken, PASSWORD_RESET_TTL_MS } from "@/lib/onboarding/activation-token";

/**
 * Emails a one-time reset link when the address belongs to an active account.
 *
 * The caller always answers the same way, whether or not an email went out, so
 * the form cannot be used to find out who has an account. Earlier unused links
 * for the user are burned: only the newest one works.
 */
export async function requestPasswordReset(params: { email: string; locale: string; origin: string }): Promise<void> {
  // Same lookup as sign-in, so the reset applies to the account that email logs into.
  const user = await prisma.user.findFirst({
    where: { email: params.email.trim().toLowerCase() },
    select: { id: true, role: true, language: true, tenant: { select: { status: true } } },
  });
  if (!user) return;
  // Sign-in refuses members of a suspended organisation; a reset would not help them.
  if (user.role !== "SUPER_ADMIN" && user.tenant?.status !== "ACTIVE") return;

  const now = new Date();
  const { token } = await prisma.$transaction(async (tx) => {
    await tx.activationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    return createActivationToken(user.id, tx, now, PASSWORD_RESET_TTL_MS);
  });

  const locale = params.locale || user.language || "tr";
  await sendEmail({
    to: params.email,
    ...passwordResetEmail({ resetUrl: localeUrl(params.origin, `/reset-password/${token}`, locale), locale }),
  });
}
