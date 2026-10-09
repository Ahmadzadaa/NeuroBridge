import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { updateProfileSchema, parseBody } from "@/lib/validation/schemas";
import { normalizeAcademicProfile } from "@/lib/users/academic-profile";
import { prisma } from "@/lib/prisma";

/** Self-service profile update — always scoped to the session user. */
export async function PATCH(request: Request) {
  return withAuthorizedHandler("settings:read", async ({ session }) => {
    const body = parseBody(updateProfileSchema, await request.json());

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone || null,
        language: body.language,
        ...normalizeAcademicProfile(body),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        language: true,
        university: true,
        faculty: true,
        specialty: true,
        studyYear: true,
      },
    });

    return NextResponse.json(updated);
  });
}
