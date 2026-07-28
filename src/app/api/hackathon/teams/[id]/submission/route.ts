import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "submissions");

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\s]/g, "_").slice(0, 120) || "project.pdf";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("hackathon:submit", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "hackathon");
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: session.id } },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this team" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file required" }, { status: 400 });
    }
    if (title.length < 3 || title.length > 150 || /[<>]/.test(title)) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    if (summary.length > 600 || /[<>]/.test(summary)) {
      return NextResponse.json({ error: "Invalid summary" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be a PDF up to 10 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Verify PDF magic bytes — MIME type alone is client-controlled.
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json(
        { error: "File is not a valid PDF" },
        { status: 400 }
      );
    }

    const dir = path.join(UPLOAD_ROOT, id);
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}.pdf`;
    await writeFile(path.join(dir, storedName), buffer);

    const latest = await prisma.projectSubmission.findFirst({
      where: { teamId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const submission = await prisma.projectSubmission.create({
      data: {
        teamId: id,
        title,
        summary: summary || null,
        fileName: sanitizeFileName(file.name),
        filePath: path.join(id, storedName),
        fileSize: buffer.length,
        version: (latest?.version ?? 0) + 1,
        submittedBy: session.id,
      },
    });

    return NextResponse.json(
      { id: submission.id, version: submission.version },
      { status: 201 }
    );
  });
}
