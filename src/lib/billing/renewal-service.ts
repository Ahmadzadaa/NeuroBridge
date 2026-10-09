import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/app-url";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { subscriptionRenewalEmail } from "@/lib/email/templates";
import { enqueueJob } from "@/lib/queue/queue";
import { seatSubtotal } from "@/lib/billing/money";
import { monthlyPeriod } from "@/lib/billing/period";
import { applyPendingSeats } from "@/lib/billing/seat-change-service";
import { createInvoice } from "@/lib/billing/invoice-service";
import { createSeatCheckout } from "@/lib/billing/checkout-service";
import { chargeStoredCardForInvoice } from "@/lib/billing/recurring-service";
import { markPastDue } from "@/lib/billing/dunning-service";

/**
 * Monthly renewal.
 *
 * A daily sweep enqueues one job per due tenant; the jobs run in the worker
 * process, never in a request. Each job is independent, so one tenant failing
 * cannot hold up the rest.
 */

export interface DueSubscription {
  id: string;
  tenantId: string;
}

/** Subscriptions whose paid period has run out. */
export async function findDueSubscriptions(
  now = new Date()
): Promise<DueSubscription[]> {
  return prisma.subscription.findMany({
    where: {
      currentPeriodEnd: { lte: now },
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    select: { id: true, tenantId: true },
  });
}

/** Enqueues one renewal job per due tenant. Returns how many were queued. */
export async function enqueueDueRenewals(now = new Date()): Promise<number> {
  const due = await findDueSubscriptions(now);

  for (const subscription of due) {
    await enqueueJob("SUBSCRIPTION_RENEWAL", {
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
    });
  }

  return due.length;
}

export type RenewalOutcome =
  | { status: "SKIPPED"; reason: string }
  | { status: "CHARGED"; invoiceId: string }
  | { status: "AWAITING_PAYMENT"; invoiceId: string; paymentUrl?: string }
  | { status: "PAST_DUE"; invoiceId: string; reason: string };

/**
 * Renews one tenant.
 *
 * Order matters: any scheduled seat decrease is applied *before* the new period
 * is priced, so the tenant is billed for what they asked to have.
 *
 * If a card is on file and automatic charging is enabled, it is charged now.
 * Otherwise an invoice and a payment link are emailed — which is the path in
 * use until PayTR card vaulting is confirmed (see docs/billing-paytr.md §7).
 */
export async function renewSubscription(
  tenantId: string,
  now = new Date()
): Promise<RenewalOutcome> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { status: "SKIPPED", reason: "no subscription" };
  }

  if (subscription.status === "CANCELED" || subscription.status === "EXPIRED") {
    return { status: "SKIPPED", reason: `status is ${subscription.status}` };
  }

  if (subscription.currentPeriodEnd > now) {
    return { status: "SKIPPED", reason: "period has not ended" };
  }

  // A pending downgrade takes effect at exactly this boundary.
  const seatState = await applyPendingSeats(tenantId);
  const seats = seatState.seats;

  const period = monthlyPeriod(subscription.currentPeriodEnd);
  const amount = seatSubtotal(subscription.pricePerSeatMonthly, seats);

  const invoice = await createInvoice({
    tenantId,
    subscriptionId: subscription.id,
    amount,
    currency: subscription.currency,
    type: "SUBSCRIPTION",
    seatCount: seats,
    periodStart: period.start,
    periodEnd: period.end,
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_RENEWED,
    tenantId,
    details: {
      invoiceId: invoice.id,
      seats,
      amount,
      periodEnd: period.end.toISOString(),
    },
  });

  // Try to charge a stored card, when that is available and permitted.
  const charge = await chargeStoredCardForInvoice(invoice, {
    customerEmail: subscription.tenant.email ?? "",
  });

  if (charge.attempted && charge.succeeded) {
    return { status: "CHARGED", invoiceId: invoice.id };
  }

  if (charge.attempted && !charge.succeeded) {
    await markPastDue(tenantId, invoice.id, charge.reason ?? "Charge declined", now);
    return {
      status: "PAST_DUE",
      invoiceId: invoice.id,
      reason: charge.reason ?? "Charge declined",
    };
  }

  // No card on file: send the tenant a link and wait for them to pay.
  const paymentUrl = await sendRenewalInvoiceEmail(invoice.id, tenantId);
  return { status: "AWAITING_PAYMENT", invoiceId: invoice.id, paymentUrl };
}

/**
 * Emails the payment link for an invoice. A failure to build the link (PayTR
 * unconfigured, network trouble) must not abort the renewal — the invoice
 * still stands and can be paid from the billing screen.
 */
export async function sendRenewalInvoiceEmail(
  invoiceId: string,
  tenantId: string
): Promise<string | undefined> {
  const [invoice, tenant] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    }),
  ]);

  if (!invoice || !tenant) return undefined;

  const admin = await prisma.user.findFirst({
    where: { tenantId, role: "TENANT_ADMIN" },
    select: { email: true, language: true },
  });

  const recipient = admin?.email ?? tenant.email;
  if (!recipient) return undefined;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Every route is locale-prefixed, so a bare path does not resolve.
  let paymentUrl = localeUrl(appUrl, "/tenant/billing", admin?.language);

  try {
    const checkout = await createSeatCheckout({
      invoice,
      customerEmail: recipient,
      userIp: "127.0.0.1",
    });
    paymentUrl = checkout.checkoutUrl;
  } catch (error) {
    console.error(
      "[billing] Could not create a payment link for invoice",
      invoice.id,
      error instanceof Error ? error.message : error
    );
  }

  await sendEmail({
    to: recipient,
    ...subscriptionRenewalEmail({
      organizationName: tenant.name,
      seats: invoice.seatCount ?? 0,
      amount: invoice.amount,
      currency: invoice.currency,
      periodEnd: invoice.periodEnd ?? new Date(),
      paymentUrl,
      language: admin?.language,
    }),
  });

  return paymentUrl;
}
