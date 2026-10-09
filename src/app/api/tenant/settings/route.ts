import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { updateTenantSettingsSchema, parseBody } from "@/lib/validation/schemas";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/lib/tenant/settings-service";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function GET() {
  return withAuthorizedHandler(
    "settings:read",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const settings = await getTenantSettings(session.tenantId);
      if (!settings) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }
      return settings;
    },
    { requireTenant: true }
  );
}

export async function PATCH(request: Request) {
  return withAuthorizedHandler(
    "settings:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(updateTenantSettingsSchema, await request.json());
      const updated = await updateTenantSettings(session.tenantId, body);

      await recordAudit({
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { fields: Object.keys(body) },
      });

      return updated;
    },
    { requireTenant: true }
  );
}
