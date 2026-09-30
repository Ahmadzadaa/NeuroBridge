import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getTemplate } from "@/lib/certificates/templates";
import {
  renderCertificateBatchPdf,
  renderCertificatePdf,
  type CertificateRenderData,
} from "@/lib/certificates/pdf-renderer";
import { createZip, safeFileName } from "@/lib/certificates/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

const line = z.string().trim().max(120);

const bulkSchema = z.object({
  templateId: z.string().trim().min(1).max(40),
  /** One certificate per name. */
  names: z.array(z.string().trim().min(1).max(120)).min(1).max(300),
  /** Shared across every certificate. {name} is substituted per recipient. */
  body: z.string().trim().min(1).max(1200),
  issuerName: line.optional(),
  signature1Name: line.optional(),
  signature1Role: line.optional(),
  signature2Name: line.optional(),
  signature2Role: line.optional(),
  format: z.enum(["merged", "zip"]).default("merged"),
});

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "participant:write",
    async () => {
      const parsed = bulkSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { templateId, names, body, format, ...shared } = parsed.data;
      const template = getTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: "Unknown template" }, { status: 404 });
      }

      const recipients: CertificateRenderData[] = names.map((name) => ({
        ...shared,
        recipientName: name,
        body: body.replaceAll("{name}", name),
      }));

      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "zip") {
        // Separate files, for emailing each participant their own certificate.
        const used = new Map<string, number>();
        const entries = [];
        for (const data of recipients) {
          const base = safeFileName(data.recipientName);
          const seen = used.get(base) ?? 0;
          used.set(base, seen + 1);
          entries.push({
            name: seen === 0 ? `${base}.pdf` : `${base} (${seen + 1}).pdf`,
            data: await renderCertificatePdf(template, data),
          });
        }
        const zip = createZip(entries);
        return new NextResponse(new Uint8Array(zip), {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="sertifikatlar-${stamp}.zip"`,
            "Cache-Control": "no-store",
          },
        });
      }

      // One document, one page per recipient — small file, fast, easy to print.
      const bytes = await renderCertificateBatchPdf(template, recipients);
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="sertifikatlar-${stamp}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    },
    { requireTenant: true }
  );
}
