import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { issueCertificateSchema, parseBody } from "@/lib/validation/schemas";
import { issueCertificate } from "@/lib/certificates/certificate-service";
import {
  CertificateAlreadyIssuedError,
  CertificateDisabledError,
  CertificateParticipantNotFoundError,
} from "@/lib/certificates/errors";

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "participant:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(issueCertificateSchema, await request.json());

      try {
        const certificate = await issueCertificate({
          userId: body.userId,
          tenantId: session.tenantId,
          type: body.type,
          issuedByUserId: session.id,
        });

        return NextResponse.json(certificate, { status: 201 });
      } catch (error) {
        if (error instanceof CertificateParticipantNotFoundError) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof CertificateDisabledError) {
          return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof CertificateAlreadyIssuedError) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        throw error;
      }
    },
    { requireTenant: true }
  );
}
