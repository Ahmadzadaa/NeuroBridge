import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { listUserCertificates } from "@/lib/certificates/certificate-service";

export async function GET() {
  return withAuthorizedHandler("certificate:read", async ({ session }) => {
    const certificates = await listUserCertificates(session.id);
    return { items: certificates };
  });
}
