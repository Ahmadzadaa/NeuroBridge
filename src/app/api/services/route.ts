import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { serviceSchema } from "@/lib/billing/validators";
import { createService } from "@/lib/billing/service-catalog";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Super admin: adds a priced service to the catalogue. */
export async function POST(request: Request) {
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const body = parseBody(serviceSchema, await request.json());
    const service = await createService(body);
    await recordAudit({
      action: AUDIT_ACTIONS.SERVICE_CREATED,
      userId: session.id,
      ip: getClientIp(request),
      details: { serviceId: service.id, code: service.code, tiers: body.tiers },
    });
    return Response.json(service, { status: 201 });
  });
}
