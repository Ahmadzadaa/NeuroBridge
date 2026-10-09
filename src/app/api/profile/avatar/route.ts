import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { apiErrorResponse } from "@/lib/auth/api-errors";
import {
  InvalidAvatarError,
  deleteAvatar,
  saveAvatar,
} from "@/lib/users/avatar-service";

/**
 * Profile picture upload — always for the session user, never for someone
 * else, so no id is accepted from the client.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler("settings:read", async ({ session }) => {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file required" }, { status: 400 });
    }

    try {
      const result = await saveAvatar(session.id, file);
      return NextResponse.json({
        avatarUrl: `/api/profile/avatar/${session.id}?v=${Date.now()}`,
        bytes: result.bytes,
      });
    } catch (error) {
      if (error instanceof InvalidAvatarError) return apiErrorResponse(error);
      throw error;
    }
  });
}

export async function DELETE() {
  return withAuthorizedHandler("settings:read", async ({ session }) => {
    await deleteAvatar(session.id);
    return NextResponse.json({ removed: true });
  });
}
