import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { updateTenantSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  presetFor,
  toFeatureColumns,
  toFeatureSet,
} from "@/lib/tenant/features";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const body = parseBody(updateTenantSchema, await request.json());

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        seatsUsed: true,
        teachersEnabled: true,
        hackathonEnabled: true,
        simulationsEnabled: true,
        trainingsEnabled: true,
        aiToolsEnabled: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (body.seatLimit !== undefined && body.seatLimit < tenant.seatsUsed) {
      return NextResponse.json(
        { error: `Seat limit cannot be below seats in use (${tenant.seatsUsed})` },
        { status: 400 }
      );
    }

    // Changing the type re-seeds the flags from its preset; individual flags
    // sent alongside still win, and flags alone can be changed without
    // touching the type.
    const baseFeatures = body.tenantType
      ? presetFor(body.tenantType)
      : toFeatureSet(tenant);
    const nextFeatures = { ...baseFeatures, ...(body.modules ?? {}) };
    const featuresChanged = body.tenantType !== undefined || body.modules !== undefined;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.seatLimit !== undefined ? { seatLimit: body.seatLimit } : {}),
        ...(body.tenantType !== undefined ? { tenantType: body.tenantType } : {}),
        ...(featuresChanged ? toFeatureColumns(nextFeatures) : {}),
      },
      select: {
        id: true,
        status: true,
        seatLimit: true,
        tenantType: true,
        teachersEnabled: true,
        hackathonEnabled: true,
        simulationsEnabled: true,
        trainingsEnabled: true,
        aiToolsEnabled: true,
      },
    });

    await recordAudit({
      action: AUDIT_ACTIONS.TENANT_UPDATED,
      userId: session.id,
      tenantId: id,
      ip: getClientIp(request),
      details: body,
    });

    return NextResponse.json(updated);
  });
}
