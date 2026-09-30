import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { issueCertificates } from "@/lib/certificates/issue-service";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().cuid(),
  templateId: z.string().trim().min(1).max(40),
  programId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(1200),
  locale: z.enum(["az", "tr", "en"]).default("az"),
});

/**
 * Issues a single certificate. Bulk issuance lives at
 * `/api/certificates/issue-bulk`; this route is the one-off case and shares the
 * same service, so both paths mint serials and store PDFs identically.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "participant:write",
    async ({ session }) => {
      const parsed = schema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.flatten() },
          { status: 400 },
        );
      }
      const body = parsed.data;
      const tenantId = session.tenantId!;

      const user = await prisma.user.findFirst({
        where: { id: body.userId, tenantId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "Participant not found in this organisation" },
          { status: 404 },
        );
      }

      // CertificateDisabledError carries its own 403 and code for the
      // shared error mapper, so it is left to propagate.
      const [outcome] = await issueCertificates({
        tenantId,
        issuedByUserId: session.id,
        templateId: body.templateId,
        programId: body.programId ?? null,
        title: body.title,
        body: body.body,
        locale: body.locale,
        recipients: [
          {
            userId: user.id,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.email,
          },
        ],
      });

      if (outcome.status === "failed") {
        return NextResponse.json({ error: outcome.reason }, { status: 500 });
      }
      return NextResponse.json(outcome, {
        status: outcome.status === "issued" ? 201 : 200,
      });
    },
    { requireTenant: true },
  );
}
