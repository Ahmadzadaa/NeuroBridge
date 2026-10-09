import { prisma } from "@/lib/prisma";
import { getAppOrigin, localeUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/email-service";
import { invitationEmail } from "@/lib/email/templates";
import { createActivationToken } from "@/lib/onboarding/activation-token";

/**
 * Emails a teacher or juror a one-time link to set their own password.
 * The account was created with an unusable password, so nothing secret is
 * shown to the admin or sent by email. Returns whether the email went out.
 */
export async function sendMemberInvitation(params: {
  userId: string;
  email: string;
  role: "TEACHER" | "JURY";
  tenantId: string;
  language?: string | null;
}): Promise<boolean> {
  const [{ token }, tenant, origin] = await Promise.all([
    createActivationToken(params.userId),
    prisma.tenant.findUnique({ where: { id: params.tenantId }, select: { name: true } }),
    getAppOrigin(),
  ]);
  const result = await sendEmail({
    to: params.email,
    ...invitationEmail({
      organizationName: tenant?.name ?? "BizSim",
      role: params.role,
      activationUrl: localeUrl(origin, `/activate/${token}`, params.language),
      locale: params.language,
    }),
  });
  return result.sent;
}
