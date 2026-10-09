import type { Invoice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaytrCredentials } from "@/lib/payment/paytr/paytr.config";
import {
  buildIframeToken,
  encodeBasket,
} from "@/lib/payment/paytr/paytr.hash";
import {
  iframeUrl,
  requestIframeToken,
} from "@/lib/payment/paytr/paytr.client";
import type {
  PaytrCurrency,
  PaytrGetTokenRequest,
} from "@/lib/payment/paytr/paytr.types";
import { toMajorUnits } from "@/lib/billing/money";
import { logPaytr } from "@/lib/payment/paytr/paytr-log";

/**
 * Turns an invoice into a PayTR payment page.
 *
 * The invoice's own `merchantOid` is used as the PayTR order id, which is what
 * ties the callback back to this invoice. Nothing here grants seats — that
 * happens only when the callback confirms payment.
 */

/** PayTR spells the Turkish lira "TL" rather than ISO "TRY". */
function toPaytrCurrency(currency: string): PaytrCurrency {
  const normalized = currency.toUpperCase();
  if (normalized === "TRY" || normalized === "TL") return "TL";
  if (
    normalized === "EUR" ||
    normalized === "USD" ||
    normalized === "GBP" ||
    normalized === "RUB"
  ) {
    return normalized;
  }
  throw new Error(`Unsupported PayTR currency: ${currency}`);
}

function describeInvoice(invoice: Invoice): string {
  const seats = invoice.seatCount ? ` (${invoice.seatCount} seats)` : "";
  return invoice.type === "SEAT_UPGRADE"
    ? `BizSim seat upgrade${seats}`
    : `BizSim subscription${seats}`;
}

export interface SeatCheckoutInput {
  invoice: Invoice;
  customerEmail: string;
  userIp: string;
  appUrl?: string;
}

export interface SeatCheckoutResult {
  checkoutUrl: string;
  merchantOid: string;
}

export interface PaytrCheckoutInput {
  merchantOid: string;
  customerEmail: string;
  /** Integer kuruş. */
  amount: number;
  currency: string;
  /** Single basket line shown on the PayTR page. */
  description: string;
  userIp: string;
  okUrl: string;
  failUrl: string;
  lang?: "tr" | "en";
}

/** Requests a PayTR iframe token and returns the payment page URL. */
export async function requestPaytrCheckoutUrl(input: PaytrCheckoutInput): Promise<string> {
  const credentials = getPaytrCredentials();
  const currency = toPaytrCurrency(input.currency);
  const basket = encodeBasket([
    [input.description, toMajorUnits(input.amount).toFixed(2), 1],
  ]);

  const request: PaytrGetTokenRequest = {
    merchant_id: credentials.merchantId,
    user_ip: input.userIp,
    merchant_oid: input.merchantOid,
    email: input.customerEmail,
    payment_amount: input.amount,
    paytr_token: buildIframeToken(credentials, {
      merchantOid: input.merchantOid,
      userIp: input.userIp,
      email: input.customerEmail,
      paymentAmount: input.amount,
      basket,
      noInstallment: 0,
      maxInstallment: 0,
      currency,
    }),
    user_basket: basket,
    debug_on: credentials.testMode,
    no_installment: 0,
    max_installment: 0,
    currency,
    test_mode: credentials.testMode,
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    lang: input.lang ?? "tr",
  };

  return iframeUrl(await requestIframeToken(request));
}

export async function createSeatCheckout(
  input: SeatCheckoutInput
): Promise<SeatCheckoutResult> {
  const { invoice } = input;
  const credentials = getPaytrCredentials();
  const appUrl =
    input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const startedAt = Date.now();
  logPaytr("info", "checkout.token_requested", {
    merchantOid: invoice.merchantOid,
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    amount: invoice.amount,
    currency: invoice.currency,
    mode: credentials.mode,
    testMode: credentials.testMode,
  });

  try {
    const checkoutUrl = await requestPaytrCheckoutUrl({
      merchantOid: invoice.merchantOid,
      customerEmail: input.customerEmail,
      amount: invoice.amount,
      currency: invoice.currency,
      description: describeInvoice(invoice),
      userIp: input.userIp,
      okUrl: `${appUrl}/tenant/billing?payment=success`,
      failUrl: `${appUrl}/tenant/billing?payment=failed`,
    });

    logPaytr("info", "checkout.token_issued", {
      merchantOid: invoice.merchantOid,
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      mode: credentials.mode,
      durationMs: Date.now() - startedAt,
    });

    await prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        provider: "PAYTR",
        merchantOid: invoice.merchantOid,
        amount: invoice.amount,
        status: "PENDING",
        attemptNo: await nextAttemptNumber(invoice.id),
      },
    });

    return { checkoutUrl, merchantOid: invoice.merchantOid };
  } catch (error) {
    // Record the failed handshake so a tenant reporting "it never opened" can
    // be traced, then let the caller surface the error.
    logPaytr("error", "checkout.token_failed", {
      merchantOid: invoice.merchantOid,
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      mode: credentials.mode,
      reason: error instanceof Error ? error.message : "PayTR token request failed",
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
          failedReasonMsg:
            error instanceof Error ? error.message : "PayTR token request failed",
          attemptNo: await nextAttemptNumber(invoice.id),
        },
      })
      .catch(() => undefined);

    throw error;
  }
}

async function nextAttemptNumber(invoiceId: string): Promise<number> {
  const count = await prisma.paymentTransaction.count({ where: { invoiceId } });
  return count + 1;
}
