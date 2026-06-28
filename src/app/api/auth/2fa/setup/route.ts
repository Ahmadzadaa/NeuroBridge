import QRCode from "qrcode";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import {
  adminRequires2FA,
  encryptSecret,
  generateTotpSecret,
  getTotpUri,
} from "@/lib/security/two-factor";

export async function POST() {
  return withAuthorizedHandler(
    "settings:write",
    async ({ session }) => {
      if (!adminRequires2FA(session.role)) {
        return Response.json(
          { error: "Two-factor authentication is only required for admin roles" },
          { status: 400 }
        );
      }

      if (session.twoFactorEnabled) {
        return Response.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 }
        );
      }

      const secret = generateTotpSecret();
      const encrypted = encryptSecret(secret);
      const uri = getTotpUri(session.email, secret);

      await prisma.user.update({
        where: { id: session.id },
        data: { twoFactorSecret: encrypted },
      });

      const qrDataUrl = await QRCode.toDataURL(uri);

      return {
        uri,
        qrDataUrl,
      };
    },
    { allow2FASetup: true, skip2FACheck: true }
  );
}
