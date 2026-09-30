import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { provisionTenantSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { activationEmail } from "@/lib/email/templates";
import { presetFor, toFeatureColumns } from "@/lib/tenant/features";
import { createActivationToken, unusablePasswordHash } from "@/lib/onboarding/activation-token";

/**
 * Platform-owner provisioning (for deals outside the self-serve pricing page):
 * creates the organization, its settings and the TENANT_ADMIN account, then
 * emails the admin a one-time activation link. No password is ever generated,
 * shown or handed over — the admin sets their own.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const body = parseBody(provisionTenantSchema, await request.json());

    const nameTaken = await prisma.tenant.findFirst({
      where: { name: body.name },
      select: { id: true },
    });
    if (nameTaken) {
      return NextResponse.json(
        { error: "An organization with this name already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await unusablePasswordHash();

    const { tenant, token } = await prisma.$transaction(async (tx) => {
      // The type seeds the module flags; anything sent explicitly wins, so a
      // university can be provisioned with a hackathon in one step.
      const features = { ...presetFor(body.tenantType), ...(body.modules ?? {}) };

      const created = await tx.tenant.create({
        data: {
          name: body.name,
          email: body.adminEmail,
          status: "ACTIVE",
          seatLimit: body.seatLimit,
          planType: body.planType,
          tenantType: body.tenantType,
          ...toFeatureColumns(features),
          settings: { create: {} },
        },
      });

      const admin = await tx.user.create({
        data: {
          tenantId: created.id,
          email: body.adminEmail,
          passwordHash,
          firstName: body.adminFirstName,
          lastName: body.adminLastName,
          role: "TENANT_ADMIN",
          language: "az",
        },
      });

      const activation = await createActivationToken(admin.id, tx);
      return { tenant: created, token: activation.token };
    });

    await recordAudit({
      action: AUDIT_ACTIONS.TENANT_CREATED,
      userId: session.id,
      tenantId: tenant.id,
      ip: getClientIp(request),
      details: {
        name: body.name,
        adminEmail: body.adminEmail,
        seatLimit: body.seatLimit,
        planType: body.planType,
        tenantType: body.tenantType,
        modules: { ...presetFor(body.tenantType), ...(body.modules ?? {}) },
      },
    });

    const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    const emailResult = await sendEmail({
      to: body.adminEmail,
      ...activationEmail({
        organizationName: body.name,
        activationUrl: `${origin}/az/activate/${token}`,
        locale: "az",
      }),
    });

    return NextResponse.json(
      { id: tenant.id, emailSent: emailResult.sent },
      { status: 201 }
    );
  });
}
