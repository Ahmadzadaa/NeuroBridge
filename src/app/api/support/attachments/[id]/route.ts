import { NextResponse } from "next/server";
import { apiErrorResponse, authorizeApi, getAuthSession } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { isImageType } from "@/lib/support/attachments";

/** Shown in the browser; anything else is downloaded rather than opened. */
const INLINE = (type: string) => isImageType(type) || type === "application/pdf";

/**
 * One file from a support conversation, for its two sides only: the platform
 * team, and the organisation the request belongs to.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    await authorizeApi(session.role === "SUPER_ADMIN" ? "platform:admin" : "support:read");

    const file = await prisma.supportAttachment.findUnique({
      where: { id },
      select: { key: true, name: true, contentType: true, message: { select: { ticket: { select: { tenantId: true } } } } },
    });
    if (!file || (session.role !== "SUPER_ADMIN" && file.message.ticket.tenantId !== session.tenantId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const disposition = `${INLINE(file.contentType) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
    const storage = getStorage();
    const signed = await storage.getSignedUrl(file.key, 300, { downloadFileName: file.name });
    if (signed) return NextResponse.redirect(signed, { headers: { "Cache-Control": "private, no-store" } });

    const bytes = await storage.get(file.key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": disposition,
        // Never kept by the browser: on a shared computer, signing out must also hide the files.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Even if a file were mislabelled, it cannot run scripts here. (A sandbox would also stop the
        // browser's own PDF viewer, so PDFs, which are checked by their first bytes, go without it.)
        ...(file.contentType === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
