import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/app-url";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import {
  paymentFailedEmail,
  subscriptionExpiredEmail,
} from "@/lib/email/templates";
import { enqueueJob } from "@/lib/queue/queue";
import { chargeStoredCardForInvoice } from "@/lib/billing/recurring-service";

/**
 * Dunning: what happens after a renewal payment fails.
 *
 * Retries land on days 1, 3 and 5 after the first failure. If the invoice is
 * still unpaid 7 days in, the subscription expires and the tenant becomes
 * read-only — **no data is ever deleted**.
 *
 * Each retry uses the invoice's existing `merchant_oid` only when no charge was
 * actually placed; a genuine re-charge goes through a fresh invoice, because
 * PayTR order ids must never be reused.
 */

/** Days after the first failure on which to retry. */
export const RETRY_DAYS = [1, 3, 5] as const;
/** Days after the first failure at which the subscription expires. */
export const EXPIRE_AFTER_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * The next retry time given how many attempts have already been made.
 * Returns null once the schedule is exhausted.
 */
export function nextRetryAfter(pastDueSince: Date, attemptsMade: number): Date | null {
  const offset = RETRY_DAYS[attemptsMade];
  return offset === undefined ? null : addDays(pastDueSince, offset);
}

export function expiryDeadline(pastDueSince: Date): Date {
  return addDays(pastDueSince, EXPIRE_AFTER_DAYS);
}

/** Moves a subscription into PAST_DUE and schedules the first retry. */
export async function markPastDue(
  tenantId: string,
  invoiceId: string,
  reason: string,
  now = new Date()
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { id: true, pastDueSince: true, dunningAttempts: true },
  });
  if (!subscription) return;

  // Keep the original failure date if this is not the first failure, so the
  // 7-day clock is not silently restarted.
  const pastDueSince = subscription.pastDueSince ?? now;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "PAST_DUE",
      pastDueSince,
      nextRetryAt: nextRetryAfter(pastDueSince, subscription.dunningAttempts),
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.PAYMENT_FAILED,
    tenantId,
    details: {
      invoiceId,
      reason,
      pastDueSince: pastDueSince.toISOString(),
      attemptsMade: subscription.dunningAttempts,
    },
  });

  await notifyPaymentFailed(tenantId, invoiceId, subscription.dunningAttempts + 1);
}

/** Subscriptions whose retry is due, or which have run out of time. */
export async function findDueDunning(now = new Date()) {
  return prisma.subscription.findMany({
    where: {
      status: "PAST_DUE",
      OR: [{ nextRetryAt: { lte: now } }, { nextRetryAt: null }],
    },
    select: { id: true, tenantId: true },
  });
}

export async function enqueueDueDunning(now = new Date()): Promise<number> {
  const due = await findDueDunning(now);

  for (const subscription of due) {
    await enqueueJob("SUBSCRIPTION_DUNNING", {
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
    });
  }

  return due.length;
}

export type DunningOutcome =
  | { status: "SKIPPED"; reason: string }
  | { status: "RECOVERED" }
  | { status: "RETRY_SCHEDULED"; attemptsMade: number; nextRetryAt: Date | null }
  | { status: "EXPIRED" };

/** Runs one dunning cycle for a tenant. */
export async function processDunning(
  tenantId: string,
  now = new Date()
): Promise<DunningOutcome> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { tenant: true },
  });

  if (!subscription) return { status: "SKIPPED", reason: "no subscription" };
  if (subscription.status !== "PAST_DUE") {
    return { status: "SKIPPED", reason: `status is ${subscription.status}` };
  }

  const pastDueSince = subscription.pastDueSince ?? now;

  const unpaid = await prisma.invoice.findFirst({
    where: { tenantId, status: { in: ["PENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
  });

  // Someone paid in the meantime (card, bank transfer, manual approval).
  if (!unpaid) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        pastDueSince: null,
        dunningAttempts: 0,
        nextRetryAt: null,
      },
    });
    return { status: "RECOVERED" };
  }

  if (now >= expiryDeadline(pastDueSince)) {
    await expireSubscription(tenantId, subscription.id);
    return { status: "EXPIRED" };
  }

  // Retry the charge when a card is on file; otherwise this cycle is just a
  // reminder email.
  const charge = await chargeStoredCardForInvoice(unpaid, {
    customerEmail: subscription.tenant.email ?? "",
  });

  if (charge.attempted && charge.succeeded) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        pastDueSince: null,
        dunningAttempts: 0,
        nextRetryAt: null,
      },
    });
    return { status: "RECOVERED" };
  }

  const attemptsMade = subscription.dunningAttempts + 1;
  const nextRetryAt = nextRetryAfter(pastDueSince, attemptsMade);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { dunningAttempts: attemptsMade, nextRetryAt },
  });

  await notifyPaymentFailed(tenantId, unpaid.id, attemptsMade, pastDueSince);

  return { status: "RETRY_SCHEDULED", attemptsMade, nextRetryAt };
}

/** Read-only mode. Data is retained in full. */
export async function expireSubscription(
  tenantId: string,
  subscriptionId: string
): Promise<void> {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "EXPIRED", nextRetryAt: null },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED,
    tenantId,
    details: { readOnly: true, dataRetained: true },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true },
  });
  const admin = await prisma.user.findFirst({
    where: { tenantId, role: "TENANT_ADMIN" },
    select: { email: true, language: true },
  });

  const recipient = admin?.email ?? tenant?.email;
  if (!recipient || !tenant) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: recipient,
    ...subscriptionExpiredEmail({
      organizationName: tenant.name,
      // Every route is locale-prefixed, so a bare path does not resolve.
      paymentUrl: localeUrl(appUrl, "/tenant/billing", admin?.language),
      language: admin?.language,
    }),
  });
}

async function notifyPaymentFailed(
  tenantId: string,
  invoiceId: string,
  attemptNo: number,
  pastDueSince = new Date()
): Promise<void> {
  const [invoice, tenant, admin] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    }),
    prisma.user.findFirst({
      where: { tenantId, role: "TENANT_ADMIN" },
      select: { email: true, language: true },
    }),
  ]);

  const recipient = admin?.email ?? tenant?.email;
  if (!invoice || !tenant || !recipient) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await sendEmail({
    to: recipient,
    ...paymentFailedEmail({
      organizationName: tenant.name,
      amount: invoice.amount,
      currency: invoice.currency,
      attemptNo,
      nextRetryAt: nextRetryAfter(pastDueSince, attemptNo),
      expiresAt: expiryDeadline(pastDueSince),
      paymentUrl: localeUrl(appUrl, "/tenant/billing", admin?.language),
      language: admin?.language,
    }),
  });
}
