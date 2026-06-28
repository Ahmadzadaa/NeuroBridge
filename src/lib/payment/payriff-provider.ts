import { createHmac, timingSafeEqual } from "crypto";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProviderAdapter,
  VerifiedWebhookEvent,
} from "@/lib/payment/types";
import {
  PaymentConfigurationError,
  PaymentVerificationError,
} from "@/lib/payment/types";

const PAYRIFF_API_BASE = process.env.PAYRIFF_API_BASE ?? "https://api.payriff.com/api/v2";

function getPayriffConfig() {
  const apiKey = process.env.PAYRIFF_API_KEY;
  const merchantId = process.env.PAYRIFF_MERCHANT_ID;
  const webhookSecret = process.env.PAYRIFF_WEBHOOK_SECRET;

  if (!apiKey || !merchantId || !webhookSecret) {
    throw new PaymentConfigurationError(
      "PAYRIFF_API_KEY, PAYRIFF_MERCHANT_ID, and PAYRIFF_WEBHOOK_SECRET are required"
    );
  }

  return { apiKey, merchantId, webhookSecret };
}

function verifyPayriffSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function createPayriffProvider(): PaymentProviderAdapter {
  return {
    name: "PAYRIFF",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const { apiKey, merchantId } = getPayriffConfig();

      const response = await fetch(`${PAYRIFF_API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          merchantId,
          amount: Math.round(input.amount * 100),
          currency: input.currency,
          description: `BizSim ${input.seatCount} seat license`,
          language: "AZ",
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payriff`,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            paymentId: input.paymentId,
            tenantId: input.tenantId,
            seatCount: input.seatCount,
            idempotencyKey: input.idempotencyKey,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new PaymentConfigurationError(
          `Payriff checkout creation failed: ${response.status} ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        orderId: string;
        paymentUrl: string;
      };

      if (!data.orderId || !data.paymentUrl) {
        throw new PaymentConfigurationError("Payriff returned an invalid checkout response");
      }

      return {
        checkoutUrl: data.paymentUrl,
        providerRef: data.orderId,
      };
    },

    async verifyWebhook(request: Request): Promise<VerifiedWebhookEvent> {
      const { webhookSecret } = getPayriffConfig();
      const signature = request.headers.get("x-payriff-signature");
      if (!signature) {
        throw new PaymentVerificationError("Missing Payriff signature header");
      }

      const body = await request.text();
      if (!verifyPayriffSignature(body, signature, webhookSecret)) {
        throw new PaymentVerificationError("Invalid Payriff webhook signature");
      }

      const event = JSON.parse(body) as {
        eventId: string;
        eventType: string;
        orderId: string;
        status: string;
        metadata?: {
          paymentId?: string;
          tenantId?: string;
          seatCount?: number;
        };
        amount?: number;
        currency?: string;
        refundAmount?: number;
      };

      let eventType: VerifiedWebhookEvent["payload"]["eventType"];
      switch (event.status) {
        case "APPROVED":
        case "SUCCEEDED":
          eventType = "payment.completed";
          break;
        case "DECLINED":
        case "FAILED":
          eventType = "payment.failed";
          break;
        case "REFUNDED":
        case "PARTIALLY_REFUNDED":
          eventType = "payment.refunded";
          break;
        default:
          throw new PaymentVerificationError(`Unhandled Payriff status: ${event.status}`);
      }

      return {
        eventId: event.eventId,
        eventType: event.eventType,
        payload: {
          eventType,
          providerRef: event.orderId,
          paymentId: event.metadata?.paymentId,
          tenantId: event.metadata?.tenantId,
          seatCount: event.metadata?.seatCount,
          amount: event.amount,
          currency: event.currency,
          refundAmount: event.refundAmount,
          raw: event,
        },
      };
    },
  };
}
