import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProviderAdapter,
  VerifiedWebhookEvent,
} from "@/lib/payment/types";
import { PaymentVerificationError } from "@/lib/payment/types";
import { toKurus } from "@/lib/billing/money";
import {
  getPaytrCredentials,
} from "@/lib/payment/paytr/paytr.config";
import {
  buildIframeToken,
  encodeBasket,
  verifyCallbackHash,
} from "@/lib/payment/paytr/paytr.hash";
import {
  iframeUrl,
  requestIframeToken,
} from "@/lib/payment/paytr/paytr.client";
import type {
  PaytrCallbackPayload,
  PaytrGetTokenRequest,
} from "@/lib/payment/paytr/paytr.types";

/**
 * PayTR uses "TL" where ISO-4217 says "TRY". Everything else lines up.
 */
function toPaytrCurrency(currency: string): "TL" | "EUR" | "USD" | "GBP" | "RUB" {
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
  throw new PaymentVerificationError(`Unsupported PayTR currency: ${currency}`);
}

/**
 * PayTR rejects Turkish characters in `email` and truncates long fields.
 * The customer IP is required; behind a proxy it comes from x-forwarded-for.
 */
function resolveClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "127.0.0.1";
}

export { resolveClientIp };

export function createPaytrProvider(): PaymentProviderAdapter {
  return {
    name: "PAYTR",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const credentials = getPaytrCredentials();
      const currency = toPaytrCurrency(input.currency);

      // The shared adapter contract carries major units; PayTR wants kuruş.
      const paymentAmount = toKurus(input.amount);
      const merchantOid = input.idempotencyKey.replace(/[^A-Za-z0-9]/g, "").slice(0, 64);

      const basket = encodeBasket([
        [
          `BizSim seat licence x${input.seatCount}`,
          (paymentAmount / 100).toFixed(2),
          1,
        ],
      ]);

      const request: PaytrGetTokenRequest = {
        merchant_id: credentials.merchantId,
        user_ip: input.userIp ?? "127.0.0.1",
        merchant_oid: merchantOid,
        email: input.customerEmail,
        payment_amount: paymentAmount,
        paytr_token: buildIframeToken(credentials, {
          merchantOid,
          userIp: input.userIp ?? "127.0.0.1",
          email: input.customerEmail,
          paymentAmount,
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
        merchant_ok_url: input.successUrl,
        merchant_fail_url: input.cancelUrl,
        lang: "tr",
      };

      const token = await requestIframeToken(request);

      return {
        checkoutUrl: iframeUrl(token),
        providerRef: merchantOid,
      };
    },

    /**
     * PayTR posts the notification as form-encoded fields and expects the
     * literal body "OK" in return. The hash is verified before the caller is
     * allowed to touch the database.
     */
    async verifyWebhook(request: Request): Promise<VerifiedWebhookEvent> {
      const credentials = getPaytrCredentials();

      const form = await request.formData();
      const payload = Object.fromEntries(
        Array.from(form.entries()).map(([key, value]) => [key, String(value)])
      ) as unknown as PaytrCallbackPayload;

      const { merchant_oid: merchantOid, status, total_amount: totalAmount, hash } =
        payload;

      if (!merchantOid || !status || !totalAmount || !hash) {
        throw new PaymentVerificationError("PayTR callback is missing required fields");
      }

      const valid = verifyCallbackHash(
        credentials,
        { merchantOid, status, totalAmount },
        hash
      );

      if (!valid) {
        throw new PaymentVerificationError("PayTR callback hash mismatch");
      }

      return {
        eventId: merchantOid,
        eventType: status === "success" ? "paytr.success" : "paytr.failed",
        payload: {
          eventType: status === "success" ? "payment.completed" : "payment.failed",
          providerRef: merchantOid,
          amount: Number(totalAmount) / 100,
          currency: payload.currency ?? "TRY",
          raw: payload,
        },
      };
    },
  };
}
