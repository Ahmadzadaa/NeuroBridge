import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import {
  contentTypeForPath,
  resolveAvatarPath,
} from "@/lib/users/avatar-service";

/**
 * Serves a stored avatar.
 *
 * Visible to the owner, to anyone in the same organisation (teachers need to
 * see their students, and leaderboards show faces), and to super admins.
 * Cached privately so a shared proxy cannot hand one user's picture to another.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("settings:read", async ({ session }) => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarPath: true, tenantId: true },
    });

    if (!user?.avatarPath) {
      return NextResponse.json({ error: "No avatar" }, { status: 404 });
    }

    const isOwner = id === session.id;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const sameTenant =
      user.tenantId !== null && user.tenantId === session.tenantId;

    if (!isOwner && !isSuperAdmin && !sameTenant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const absolute = resolveAvatarPath(user.avatarPath);
    if (!absolute) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const buffer = await readFile(absolute);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentTypeForPath(user.avatarPath),
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }
  });
}
