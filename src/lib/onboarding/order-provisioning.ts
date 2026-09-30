import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { activationEmail } from "@/lib/email/templates";
import { toFeatureColumns, type TenantFeature, type TenantType } from "@/lib/tenant/features";
import { createActivationToken, unusablePasswordHash } from "@/lib/onboarding/activation-token";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";

/**
 * Turns a paid self-serve order into a live tenant.
 *
 * Runs from the PayTR callback after the hash is verified. PayTR retries until
 * it gets "OK", so this must be idempotent: the PENDING/FAILED -> PAID update
 * is conditional, and only the caller that wins it provisions anything.
 */

/** Service codes that switch on a built-in module. Other services only get a limit row. */
const SERVICE_FEATURES: Record<string, TenantFeature> = {
  TEACHERS: "teachers",
  HACKATHON: "hackathon",
  SIMULATIONS: "simulations",
  TRAININGS: "trainings",
  AI_TOOLS: "aiTools",
};

export type OrderCallbackResult =
  | { outcome: "PROVISIONED"; orderId: string; tenantId: string; emailSent: boolean }
  | { outcome: "DUPLICATE"; orderId: string }
  | { outcome: "FAILED"; orderId: string };

export class UnknownOrderError extends Error {
  constructor(merchantOid: string) {
    super(`No order for merchant_oid ${merchantOid}`);
    this.name = "UnknownOrderError";
  }
}

function tenantTypeFor(features: Set<TenantFeature>): TenantType {
  if (features.has("teachers") && !features.has("hackathon")) return "UNIVERSITY";
  if (features.has("hackathon") && !features.has("teachers")) return "TECHNOPARK";
  return "FULL";
}

export async function processOrderCallback(
  payload: PaytrCallbackPayload,
  appUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
): Promise<OrderCallbackResult> {
  const order = await prisma.order.findUnique({
    where: { paytrMerchantOid: payload.merchant_oid },
    include: { items: { include: { service: { select: { code: true } } } } },
  });
  // Not written yet or not ours: throw so the route asks PayTR to retry.
  if (!order) throw new UnknownOrderError(payload.merchant_oid);

  if (order.status === "PAID") return { outcome: "DUPLICATE", orderId: order.id };

  const paidAmount = Number(payload.total_amount);
  if (payload.status !== "success" || !Number.isInteger(paidAmount) || paidAmount < order.total) {
    if (payload.status === "success") {
      console.error(
        `Order ${order.id}: PayTR reported ${payload.total_amount}, expected at least ${order.total}`
      );
    }
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return { outcome: "FAILED", orderId: order.id };
  }

  const features = new Set(
    order.items.map((i) => SERVICE_FEATURES[i.service.code]).filter((f): f is TenantFeature => !!f)
  );
  const featureSet = {
    teachers: features.has("teachers"),
    hackathon: features.has("hackathon"),
    simulations: features.has("simulations"),
    trainings: features.has("trainings"),
    aiTools: features.has("aiTools"),
  };
  // A person can take part in several services, so the largest service
  // bounds how many distinct accounts the tenant needs.
  const seatLimit = Math.max(...order.items.map((i) => i.participantCount));
  const passwordHash = await unusablePasswordHash();

  const provisioned = await prisma.$transaction(async (tx) => {
    // A FAILED order can still be paid (the customer retried on PayTR's page),
    // so both non-PAID states are claimable.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    const tenant = await tx.tenant.create({
      data: {
        name: order.institutionName,
        email: order.contactEmail,
        status: "ACTIVE",
        seatLimit,
        planType: "services",
        tenantType: tenantTypeFor(features),
        ...toFeatureColumns(featureSet),
        settings: { create: { authorizedContact: order.contactName } },
        services: {
          create: order.items.map((i) => ({
            serviceId: i.serviceId,
            participantLimit: i.participantCount,
          })),
        },
      },
    });

    const [firstName, ...rest] = order.contactName.trim().split(/\s+/);
    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: order.contactEmail,
        passwordHash,
        firstName,
        lastName: rest.join(" ") || null,
        role: "TENANT_ADMIN",
        language: order.locale,
      },
    });

    await tx.order.update({ where: { id: order.id }, data: { tenantId: tenant.id } });
    const activation = await createActivationToken(admin.id, tx);

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.TENANT_CREATED,
      tenantId: tenant.id,
      details: { source: "order", orderId: order.id, total: order.total, seatLimit },
    });

    return { tenant, token: activation.token };
  });

  if (!provisioned) return { outcome: "DUPLICATE", orderId: order.id };

  // Sent after commit: a mail outage must not roll back a paid tenant.
  const emailSent = await sendActivation(order, provisioned.token, appUrl);

  return {
    outcome: "PROVISIONED",
    orderId: order.id,
    tenantId: provisioned.tenant.id,
    emailSent,
  };
}

async function sendActivation(
  order: { id: string; contactEmail: string; institutionName: string; locale: string },
  token: string,
  appUrl: string
): Promise<boolean> {
  const result = await sendEmail({
    to: order.contactEmail,
    ...activationEmail({
      organizationName: order.institutionName,
      activationUrl: `${appUrl}/${order.locale}/activate/${token}`,
      locale: order.locale,
    }),
  }).catch((error: unknown) => {
    console.error(`Activation email for order ${order.id} failed:`, error);
    return { sent: false };
  });
  return result.sent;
}

export class ResendActivationError extends Error {
  readonly statusCode: number;
  constructor(
    public readonly code: "NOT_FOUND" | "NOT_PROVISIONED" | "ALREADY_ACTIVATED",
    message: string
  ) {
    super(message);
    this.name = "ResendActivationError";
    this.statusCode = code === "NOT_FOUND" ? 404 : 409;
  }
}

/**
 * Issues a fresh activation link for a paid order whose admin has not set a
 * password yet (lost email, expired link). Older unused links are revoked so
 * only the newest one works.
 */
export async function resendOrderActivation(
  orderId: string,
  appUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
): Promise<{ emailSent: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ResendActivationError("NOT_FOUND", "Order not found");
  if (order.status !== "PAID" || !order.tenantId) {
    throw new ResendActivationError("NOT_PROVISIONED", "Order has no provisioned tenant");
  }

  const admin = await prisma.user.findFirst({
    where: { tenantId: order.tenantId, email: order.contactEmail, role: "TENANT_ADMIN" },
    select: { id: true, activationTokens: { where: { usedAt: { not: null } }, select: { id: true } } },
  });
  if (!admin) throw new ResendActivationError("NOT_FOUND", "Tenant admin not found");
  if (admin.activationTokens.length > 0) {
    throw new ResendActivationError("ALREADY_ACTIVATED", "The admin has already set a password");
  }

  const token = await prisma.$transaction(async (tx) => {
    const now = new Date();
    // Revoke by expiring, not by marking used: usedAt means "password set".
    await tx.activationToken.updateMany({
      where: { userId: admin.id, usedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
    return (await createActivationToken(admin.id, tx)).token;
  });

  return { emailSent: await sendActivation(order, token, appUrl) };
}
