import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "submissions");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("hackathon:read", async ({ session }) => {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            program: { select: { tenantId: true } },
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Team members, tenant staff/juries of the same tenant, and super admins.
    const isMember = submission.team.members.some(
      (m) => m.userId === session.id
    );
    const sameTenant = session.tenantId === submission.team.program.tenantId;
    const isReviewer =
      session.role === "SUPER_ADMIN" ||
      (sameTenant &&
        (hasPermission(session.role, "hackathon:score") ||
          hasPermission(session.role, "hackathon:manage")));

    if (!isMember && !isReviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // filePath is server-generated (teamId/uuid.pdf) — resolve defensively anyway.
    const absolute = path.resolve(UPLOAD_ROOT, submission.filePath);
    if (!absolute.startsWith(path.resolve(UPLOAD_ROOT))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const buffer = await readFile(absolute);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${submission.fileName}"`,
          "Cache-Control": "private, max-age=0",
        },
      });
    } catch {
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }
  });
}
