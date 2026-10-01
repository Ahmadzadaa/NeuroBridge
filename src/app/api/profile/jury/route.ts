import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { juryProfileSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

/** A juror's public profile: name, current role and experience. Their own account only. */
export async function PATCH(request: Request) {
  return withAuthorizedHandler("jury:score", async ({ session }) => {
    const body = parseBody(juryProfileSchema, await request.json());
    return prisma.user.update({
      where: { id: session.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        headline: body.headline || null,
        bio: body.bio || null,
      },
      select: { firstName: true, lastName: true, headline: true, bio: true },
    });
  });
}
