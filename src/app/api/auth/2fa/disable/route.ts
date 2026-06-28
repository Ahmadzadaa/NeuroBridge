import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  verifyTotpCode,
} from "@/lib/security/two-factor";
import { twoFactorVerifySchema, parseBody } from "@/lib/validation/schemas";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "settings:write",
    async ({ session }) => {
      const body = parseBody(twoFactorVerifySchema, await request.json());

      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
        return Response.json(
          { error: "Two-factor authentication is not enabled" },
          { status: 400 }
        );
      }

      const secret = decryptSecret(user.twoFactorSecret);
      if (!verifyTotpCode(secret, body.totpCode)) {
        return Response.json({ error: "Invalid verification code" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.userRecoveryCode.deleteMany({ where: { userId: session.id } }),
        prisma.user.update({
          where: { id: session.id },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
          },
        }),
      ]);

      await recordAudit({
        action: AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
      });

      return { disabled: true };
    },
    { skip2FACheck: true }
  );
}
