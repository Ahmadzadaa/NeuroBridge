import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import {
  getCertificatePdfUrl,
  readCertificatePdf,
} from "@/lib/certificates/storage";
import { ensureCertificatePdf } from "@/lib/certificates/issue-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("certificate:read", async ({ session }) => {
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        userId: true,
        tenantId: true,
        pdfPath: true,
        revokedAt: true,
        recipientName: true,
        serialNumber: true,
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // The holder, or staff of the same organisation. A super admin is not
    // given access here on purpose: certificates are tenant content.
    const isHolder = certificate.userId === session.id;
    const isTenantStaff =
      session.tenantId === certificate.tenantId &&
      hasPermission(session.role, "participant:write");

    if (!isHolder && !isTenantStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (certificate.revokedAt) {
      return NextResponse.json({ error: "Certificate revoked" }, { status: 410 });
    }

    const fileName = `${certificate.serialNumber}.pdf`;
    // Certificates recorded before PDFs existed get theirs on first download.
    const pdfPath = certificate.pdfPath ?? (await ensureCertificatePdf(id));

    // Every check above still runs on every request: this route stays the only
    // way in, and the bucket itself is private. The signed URL is minted only
    // after the caller has been cleared, and is short-lived because it cannot
    // be withdrawn once handed out — see signedUrlTtl().
    const signedUrl = await getCertificatePdfUrl(pdfPath, {
      fileName,
    });
    if (signedUrl) {
      return NextResponse.redirect(signedUrl, {
        status: 302,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    // Drivers that cannot presign (local disk in development) are served the
    // old way, through this process.
    const bytes = await readCertificatePdf(pdfPath);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
