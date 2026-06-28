import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/security/two-factor";
import { twoFactorSetupSchema, parseBody } from "@/lib/validation/schemas";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "settings:write",
    async ({ session }) => {
      const body = parseBody(twoFactorSetupSchema, await request.json());

      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user?.twoFactorSecret) {
        return Response.json(
          { error: "Run two-factor setup before enabling" },
          { status: 400 }
        );
      }

      if (user.twoFactorEnabled) {
        return Response.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 }
        );
      }

      const secret = decryptSecret(user.twoFactorSecret);
      if (!verifyTotpCode(secret, body.totpCode)) {
        return Response.json({ error: "Invalid verification code" }, { status: 400 });
      }

      const recoveryCodes = generateRecoveryCodes();
      const hashedCodes = await Promise.all(
        recoveryCodes.map(async (code) => ({
          codeHash: await hashRecoveryCode(code),
        }))
      );

      await prisma.$transaction([
        prisma.userRecoveryCode.deleteMany({ where: { userId: session.id } }),
        prisma.user.update({
          where: { id: session.id },
          data: { twoFactorEnabled: true },
        }),
        ...hashedCodes.map((entry) =>
          prisma.userRecoveryCode.create({
            data: { userId: session.id, codeHash: entry.codeHash },
          })
        ),
      ]);

      await recordAudit({
        action: AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
      });

      return {
        enabled: true,
        recoveryCodes,
      };
    },
    { allow2FASetup: true, skip2FACheck: true }
  );
}
