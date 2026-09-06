import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getTemplate } from "@/lib/certificates/templates";
import { renderCertificatePdf } from "@/lib/certificates/pdf-renderer";

export const runtime = "nodejs";

const line = z.string().trim().max(120);

const previewSchema = z.object({
  templateId: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1200),
  issuerName: line.optional(),
  signature1Name: line.optional(),
  signature1Role: line.optional(),
  signature2Name: line.optional(),
  signature2Role: line.optional(),
});

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "participant:write",
    async () => {
      const parsed = previewSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { templateId, ...data } = parsed.data;
      const template = getTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: "Unknown template" }, { status: 404 });
      }

      const bytes = await renderCertificatePdf(template, data);

      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="certificate-preview.pdf"',
          "Cache-Control": "no-store",
        },
      });
    },
    { requireTenant: true }
  );
}
