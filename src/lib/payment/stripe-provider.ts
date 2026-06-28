import Stripe from "stripe";
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

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new PaymentConfigurationError("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
}

function mapStripeEventType(type: string): VerifiedWebhookEvent["payload"]["eventType"] | null {
  switch (type) {
    case "checkout.session.completed":
      return "payment.completed";
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      return "payment.failed";
    case "charge.refunded":
      return "payment.refunded";
    default:
      return null;
  }
}

function normalizeStripeEvent(event: Stripe.Event): VerifiedWebhookEvent["payload"] | null {
  const mappedType = mapStripeEventType(event.type);
  if (!mappedType) return null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const seatCount = Number(session.metadata?.seatCount ?? 0);
    const tenantId = session.metadata?.tenantId;
    const paymentId = session.metadata?.paymentId;

    if (!session.id || !tenantId || !paymentId || !seatCount) {
      throw new PaymentVerificationError("Stripe checkout session missing metadata");
    }

    return {
      eventType: mappedType,
      providerRef: session.id,
      paymentId,
      tenantId,
      seatCount,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "try").toUpperCase(),
      raw: event,
    };
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      eventType: mappedType,
      providerRef: session.id,
      paymentId: session.metadata?.paymentId,
      tenantId: session.metadata?.tenantId,
      raw: event,
    };
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      eventType: mappedType,
      providerRef: intent.id,
      paymentId: intent.metadata?.paymentId,
      tenantId: intent.metadata?.tenantId,
      raw: event,
    };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentId = charge.metadata?.paymentId;
    const tenantId = charge.metadata?.tenantId;
    const seatCount = Number(charge.metadata?.seatCount ?? 0);
    const refundAmount = charge.amount_refunded / 100;

    return {
      eventType: mappedType,
      providerRef: (charge.payment_intent as string) ?? charge.id,
      paymentId,
      tenantId,
      seatCount,
      refundAmount,
      amount: charge.amount / 100,
      currency: (charge.currency ?? "try").toUpperCase(),
      raw: event,
    };
  }

  return null;
}

export function createStripeProvider(): PaymentProviderAdapter {
  return {
    name: "STRIPE",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: input.customerEmail,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: input.currency.toLowerCase(),
                unit_amount: Math.round(input.amount * 100),
                product_data: {
                  name: `BizSim Seat License (${input.seatCount} seats)`,
                  description: `Adds ${input.seatCount} participant seats to tenant ${input.tenantId}`,
                },
              },
            },
          ],
          success_url: `${input.successUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.cancelUrl}?payment=cancelled`,
          metadata: {
            paymentId: input.paymentId,
            tenantId: input.tenantId,
            seatCount: String(input.seatCount),
            idempotencyKey: input.idempotencyKey,
          },
        },
        { idempotencyKey: input.idempotencyKey }
      );

      if (!session.url || !session.id) {
        throw new PaymentConfigurationError("Stripe did not return a checkout URL");
      }

      return {
        checkoutUrl: session.url,
        providerRef: session.id,
      };
    },

    async verifyWebhook(request: Request): Promise<VerifiedWebhookEvent> {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new PaymentConfigurationError("STRIPE_WEBHOOK_SECRET is not configured");
      }

      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        throw new PaymentVerificationError("Missing Stripe signature header");
      }

      const body = await request.text();
      const stripe = getStripeClient();

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch {
        throw new PaymentVerificationError("Invalid Stripe webhook signature");
      }

      const payload = normalizeStripeEvent(event);
      if (!payload) {
        return {
          eventId: event.id,
          eventType: event.type,
          payload: {
            eventType: "payment.completed",
            providerRef: "",
            raw: event,
          },
          skipped: true,
        } as VerifiedWebhookEvent & { skipped?: boolean };
      }

      return {
        eventId: event.id,
        eventType: event.type,
        payload,
      };
    },
  };
}
