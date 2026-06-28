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

const IYZICO_API_BASE = process.env.IYZICO_API_BASE ?? "https://api.iyzipay.com";

function getIyzicoConfig() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const webhookSecret = process.env.IYZICO_WEBHOOK_SECRET;

  if (!apiKey || !secretKey || !webhookSecret) {
    throw new PaymentConfigurationError(
      "IYZICO_API_KEY, IYZICO_SECRET_KEY, and IYZICO_WEBHOOK_SECRET are required"
    );
  }

  return { apiKey, secretKey, webhookSecret };
}

function buildIyzicoAuthorization(
  apiKey: string,
  secretKey: string,
  requestBody: string
): string {
  const signature = createHmac("sha256", secretKey).update(requestBody).digest("hex");
  return `IYZWS ${apiKey}:${signature}`;
}

function verifyIyzicoSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function createIyzicoProvider(): PaymentProviderAdapter {
  return {
    name: "IYZICO",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const { apiKey, secretKey } = getIyzicoConfig();
      const conversationId = input.idempotencyKey;

      const requestBody = JSON.stringify({
        locale: "tr",
        conversationId,
        price: input.amount.toFixed(2),
        paidPrice: input.amount.toFixed(2),
        currency: input.currency,
        basketId: input.paymentId,
        paymentGroup: "PRODUCT",
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/iyzico`,
        enabledInstallments: [1],
        buyer: {
          id: input.tenantId,
          name: "Tenant",
          surname: "Admin",
          email: input.customerEmail,
          identityNumber: "11111111111",
          registrationAddress: "N/A",
          city: "Istanbul",
          country: "Turkey",
        },
        basketItems: [
          {
            id: input.paymentId,
            name: `BizSim Seat License (${input.seatCount})`,
            category1: "License",
            itemType: "VIRTUAL",
            price: input.amount.toFixed(2),
          },
        ],
        metadata: {
          paymentId: input.paymentId,
          tenantId: input.tenantId,
          seatCount: input.seatCount,
        },
      });

      const response = await fetch(`${IYZICO_API_BASE}/payment/iyzipos/checkoutform/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildIyzicoAuthorization(apiKey, secretKey, requestBody),
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new PaymentConfigurationError(
          `Iyzico checkout creation failed: ${response.status} ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        status: string;
        token: string;
        paymentPageUrl: string;
        conversationId: string;
      };

      if (data.status !== "success" || !data.paymentPageUrl || !data.token) {
        throw new PaymentConfigurationError("Iyzico returned an invalid checkout response");
      }

      return {
        checkoutUrl: data.paymentPageUrl,
        providerRef: data.token,
      };
    },

    async verifyWebhook(request: Request): Promise<VerifiedWebhookEvent> {
      const { webhookSecret } = getIyzicoConfig();
      const signature = request.headers.get("x-iyz-signature");
      if (!signature) {
        throw new PaymentVerificationError("Missing Iyzico signature header");
      }

      const body = await request.text();
      if (!verifyIyzicoSignature(body, signature, webhookSecret)) {
        throw new PaymentVerificationError("Invalid Iyzico webhook signature");
      }

      const event = JSON.parse(body) as {
        iyziEventId: string;
        iyziEventType: string;
        token: string;
        status: string;
        paymentId?: string;
        tenantId?: string;
        seatCount?: number;
        paidPrice?: string;
        currency?: string;
        refundPrice?: string;
      };

      let eventType: VerifiedWebhookEvent["payload"]["eventType"];
      switch (event.status) {
        case "SUCCESS":
          eventType = "payment.completed";
          break;
        case "FAILURE":
          eventType = "payment.failed";
          break;
        case "REFUND":
          eventType = "payment.refunded";
          break;
        default:
          throw new PaymentVerificationError(`Unhandled Iyzico status: ${event.status}`);
      }

      return {
        eventId: event.iyziEventId,
        eventType: event.iyziEventType,
        payload: {
          eventType,
          providerRef: event.token,
          paymentId: event.paymentId,
          tenantId: event.tenantId,
          seatCount: event.seatCount,
          amount: event.paidPrice ? Number(event.paidPrice) : undefined,
          currency: event.currency,
          refundAmount: event.refundPrice ? Number(event.refundPrice) : undefined,
          raw: event,
        },
      };
    },
  };
}
