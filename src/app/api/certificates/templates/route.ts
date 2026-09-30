import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { CERTIFICATE_TEMPLATES } from "@/lib/certificates/templates";

export async function GET() {
  return withAuthorizedHandler("certificate:read", async () => ({
    items: Object.values(CERTIFICATE_TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      style: t.style,
      type: t.type,
      defaultBody: t.defaultBody,
      fields: t.blocks.map((b) => b.key),
    })),
  }));
}
