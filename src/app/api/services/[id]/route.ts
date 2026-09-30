import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { serviceUpdateSchema } from "@/lib/billing/validators";
import { deleteService, updateService } from "@/lib/billing/service-catalog";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

type Context = { params: Promise<{ id: string }> };

/** Super admin: renames, (de)activates, or replaces a service's tiers. */
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const body = parseBody(serviceUpdateSchema, await request.json());
    const service = await updateService(id, body);
    await recordAudit({
      action: AUDIT_ACTIONS.SERVICE_UPDATED,
      userId: session.id,
      ip: getClientIp(request),
      details: { serviceId: id, ...body },
    });
    return service;
  });
}

/** Super admin: removes a never-ordered service. Ordered ones must be deactivated. */
export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    await deleteService(id);
    await recordAudit({
      action: AUDIT_ACTIONS.SERVICE_DELETED,
      userId: session.id,
      ip: getClientIp(request),
      details: { serviceId: id },
    });
    return { ok: true };
  });
}
