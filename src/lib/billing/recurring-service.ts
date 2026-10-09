import type { Invoice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPaytrCredentials,
  isPaytrConfigured,
  isRecurringEnabled,
} from "@/lib/payment/paytr/paytr.config";
import {
  buildRecurringToken,
  encodeBasket,
} from "@/lib/payment/paytr/paytr.hash";
import {
  chargeStoredCard,
  listStoredCards,
} from "@/lib/payment/paytr/paytr.client";
import type {
  PaytrCurrency,
  PaytrRecurringChargeRequest,
} from "@/lib/payment/paytr/paytr.types";
import { toMajorUnits } from "@/lib/billing/money";
import { markInvoicePaid } from "@/lib/billing/invoice-service";
import { fingerprint, logPaytr } from "@/lib/payment/paytr/paytr-log";

/**
 * Automatic charging of a vaulted card.
 *
 * This runs only when both are true:
 *   1. a PayTR `utoken` is on file for the tenant, and
 *   2. `PAYTR_NON3D_ENABLED=1` — recurring charges are Non3D, which PayTR
 *      grants per merchant account.
 *
 * When either is missing the caller falls back to emailing a payment link, so
 * renewal still works. See docs/billing-paytr.md §7.
 */

export interface ChargeAttempt {
  /** False means no charge was tried — not that one failed. */
  attempted: boolean;
  succeeded: boolean;
  reason?: string;
}

const NOT_ATTEMPTED = (reason: string): ChargeAttempt => ({
  attempted: false,
  succeeded: false,
  reason,
});

/** Records why no charge was tried, which is the harder case to diagnose later. */
function skip(invoice: Invoice, reason: string): ChargeAttempt {
  logPaytr("info", "recurring.skipped", {
    merchantOid: invoice.merchantOid,
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    reason,
  });
  return NOT_ATTEMPTED(reason);
}

function toPaytrCurrency(currency: string): PaytrCurrency {
  const normalized = currency.toUpperCase();
  return normalized === "TRY" || normalized === "TL"
    ? "TL"
    : (normalized as PaytrCurrency);
}

export async function chargeStoredCardForInvoice(
  invoice: Invoice,
  options: { customerEmail: string; userIp?: string }
): Promise<ChargeAttempt> {
  if (!isPaytrConfigured()) return skip(invoice, "PayTR is not configured");
  if (!isRecurringEnabled()) {
    return skip(invoice, "Automatic charging is disabled (PAYTR_NON3D_ENABLED)");
  }
  if (!options.customerEmail) {
    return skip(invoice, "Tenant has no billing email");
  }

  const method = await prisma.paymentMethod.findFirst({
    where: { tenantId: invoice.tenantId, provider: "PAYTR" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  if (!method) return skip(invoice, "No stored card for this tenant");

  const credentials = getPaytrCredentials();

  // The ctoken identifies the individual card and can change, so it is read
  // fresh rather than trusted from our copy.
  let ctoken = method.ctoken;
  try {
    const cards = await listStoredCards(credentials, method.utoken);
    const card = cards[0];
    if (!card) return skip(invoice, "PayTR has no cards stored for this utoken");

    ctoken = card.ctoken;

    await prisma.paymentMethod.update({
      where: { id: method.id },
      data: {
        ctoken: card.ctoken,
        cardMask: card.last_4 ? `**** **** **** ${card.last_4}` : method.cardMask,
        cardBrand: card.schema ?? card.c_brand ?? method.cardBrand,
      },
    });
  } catch (error) {
    return {
      attempted: false,
      succeeded: false,
      reason: `Could not read stored cards: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }

  if (!ctoken) return skip(invoice, "Stored card has no ctoken");

  const currency = toPaytrCurrency(invoice.currency);
  const userIp = options.userIp ?? "127.0.0.1";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const basket = encodeBasket([
    ["BizSim subscription", toMajorUnits(invoice.amount).toFixed(2), 1],
  ]);

  const request: PaytrRecurringChargeRequest = {
    merchant_id: credentials.merchantId,
    paytr_token: buildRecurringToken(credentials, {
      merchantOid: invoice.merchantOid,
      userIp,
      email: options.customerEmail,
      paymentAmount: invoice.amount,
      paymentType: "card",
      installmentCount: 0,
      currency,
      non3d: 1,
    }),
    user_ip: userIp,
    merchant_oid: invoice.merchantOid,
    email: options.customerEmail,
    payment_type: "card",
    payment_amount: invoice.amount,
    installment_count: 0,
    currency,
    test_mode: credentials.testMode,
    non_3d: 1,
    utoken: method.utoken,
    ctoken,
    merchant_ok_url: `${appUrl}/tenant/billing?payment=success`,
    merchant_fail_url: `${appUrl}/tenant/billing?payment=failed`,
    user_name: "BizSim Tenant",
    user_address: "-",
    user_phone: "-",
    user_basket: basket,
    recurring_payment: 1,
  };

  const attemptNo =
    (await prisma.paymentTransaction.count({ where: { invoiceId: invoice.id } })) + 1;

  const startedAt = Date.now();
  // The card handle is logged as a fingerprint only: it is not a secret, but it
  // is enough to charge the card, so it never appears in plaintext in a log.
  const cardFingerprint = fingerprint(method.utoken);

  logPaytr("info", "recurring.charge_started", {
    merchantOid: invoice.merchantOid,
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    amount: invoice.amount,
    currency: invoice.currency,
    mode: credentials.mode,
    testMode: credentials.testMode,
    attemptNo,
    cardFingerprint,
  });

  try {
    const response = await chargeStoredCard(request);

    await prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        provider: "PAYTR",
        merchantOid: invoice.merchantOid,
        amount: invoice.amount,
        status: response.status === "success" ? "SUCCESS" : "PENDING",
        rawResponse: JSON.stringify(response),
        failedReasonCode:
          "failed_reason_code" in response ? response.failed_reason_code ?? null : null,
        failedReasonMsg:
          "failed_reason_msg" in response ? response.failed_reason_msg ?? null : null,
        attemptNo,
      },
    });

    if (response.status === "success") {
      await markInvoicePaid(invoice.id);
      logPaytr("info", "recurring.charge_succeeded", {
        merchantOid: invoice.merchantOid,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: invoice.amount,
        mode: credentials.mode,
        attemptNo,
        cardFingerprint,
        durationMs: Date.now() - startedAt,
      });
      return { attempted: true, succeeded: true };
    }

    if (response.status === "wait_callback") {
      // PayTR will confirm asynchronously; the callback settles the invoice.
      logPaytr("info", "recurring.charge_declined", {
        merchantOid: invoice.merchantOid,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        mode: credentials.mode,
        attemptNo,
        outcome: "WAIT_CALLBACK",
        durationMs: Date.now() - startedAt,
      });
      return {
        attempted: true,
        succeeded: false,
        reason: "Awaiting PayTR callback",
      };
    }

    const declineReason =
      response.failed_reason_msg ??
      response.err_msg ??
      response.reason ??
      "Charge declined";

    logPaytr("warn", "recurring.charge_declined", {
      merchantOid: invoice.merchantOid,
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      mode: credentials.mode,
      attemptNo,
      cardFingerprint,
      failed_reason_code: response.failed_reason_code ?? null,
      reason: declineReason,
      durationMs: Date.now() - startedAt,
    });

    return { attempted: true, succeeded: false, reason: declineReason };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Charge request failed";

    logPaytr("error", "recurring.charge_failed", {
      merchantOid: invoice.merchantOid,
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      mode: credentials.mode,
      attemptNo,
      cardFingerprint,
      reason,
      durationMs: Date.now() - startedAt,
    });

    await prisma.paymentTransaction
      .create({
        data: {
          invoiceId: invoice.id,
          provider: "PAYTR",
          merchantOid: invoice.merchantOid,
          amount: invoice.amount,
          status: "FAILED",
          failedReasonMsg: reason,
          attemptNo,
        },
      })
      .catch(() => undefined);

    return { attempted: true, succeeded: false, reason };
  }
}
