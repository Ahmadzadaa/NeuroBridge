import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { issueCertificates } from "@/lib/certificates/issue-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const line = z.string().trim().max(120);

const schema = z.object({
  templateId: z.string().trim().min(1).max(40),
  userIds: z.array(z.string().cuid()).min(1).max(300),
  programId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(1200),
  locale: z.enum(["az", "tr", "en"]).default("az"),
  issuerName: line.optional(),
  signature1Name: line.optional(),
  signature1Role: line.optional(),
  signature2Name: line.optional(),
  signature2Role: line.optional(),
});

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

      // Never trust the id list: only issue to users of this tenant, and take
      // the name from the database rather than from the request, so the
      // document cannot be made out to an arbitrary name.
      const users = await prisma.user.findMany({
        where: { id: { in: body.userIds }, tenantId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      if (users.length === 0) {
        return NextResponse.json(
          { error: "No matching participants in this organisation" },
          { status: 404 },
        );
      }

      if (body.programId) {
        const program = await prisma.program.findUnique({
          where: { id: body.programId },
          select: { tenantId: true },
        });
        if (!program || program.tenantId !== tenantId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      // CertificateDisabledError carries its own 403 and code for the
      // shared error mapper, so it is left to propagate.
      const outcomes = await issueCertificates({
        tenantId,
        issuedByUserId: session.id,
        templateId: body.templateId,
        programId: body.programId ?? null,
        title: body.title,
        body: body.body,
        locale: body.locale,
        issuerName: body.issuerName,
        signature1Name: body.signature1Name,
        signature1Role: body.signature1Role,
        signature2Name: body.signature2Name,
        signature2Role: body.signature2Role,
        recipients: users.map((u) => ({
          userId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        })),
      });

      return NextResponse.json({
        issued: outcomes.filter((o) => o.status === "issued").length,
        already: outcomes.filter((o) => o.status === "already").length,
        failed: outcomes.filter((o) => o.status === "failed").length,
        skippedNotInTenant: body.userIds.length - users.length,
        outcomes,
      });
    },
    { requireTenant: true },
  );
}
