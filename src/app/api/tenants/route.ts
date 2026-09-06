import { localeUrl } from "@/lib/app-url";
import { routing } from "@/i18n/routing";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { provisionTenantSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { tenantWelcomeEmail } from "@/lib/email/templates";
import { presetFor, toFeatureColumns } from "@/lib/tenant/features";

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = () =>
    Array.from(randomBytes(3))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${pick()}-${pick()}-${pick()}`;
}

/**
 * Platform-owner provisioning: creates the organization, its settings,
 * and the TENANT_ADMIN account, then emails the credentials. The platform
 * owner hands the account over and stays out of tenant content.
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

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const tenant = await prisma.$transaction(async (tx) => {
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

      await tx.user.create({
        data: {
          tenantId: created.id,
          email: body.adminEmail,
          passwordHash,
          firstName: body.adminFirstName,
          lastName: body.adminLastName,
          role: "TENANT_ADMIN",
          // No preference exists yet for a brand-new admin; the language the
          // super admin is provisioning in is the closest available signal.
          language: session.language ?? routing.defaultLocale,
        },
      });

      return created;
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
      ...tenantWelcomeEmail({
        organizationName: body.name,
        adminEmail: body.adminEmail,
        tempPassword,
        seatLimit: body.seatLimit,
        loginUrl: localeUrl(origin, "/login", session.language),
        language: session.language,
      }),
    });

    // tempPassword is shown exactly once, so the platform owner can hand it over.
    return NextResponse.json(
      { id: tenant.id, tempPassword, emailSent: emailResult.sent },
      { status: 201 }
    );
  });
}
