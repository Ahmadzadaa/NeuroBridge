import type { PaymentProvider } from "@/lib/types";

export type PaymentEventType =
  | "payment.completed"
  | "payment.failed"
  | "payment.refunded";

export interface CreateCheckoutInput {
  paymentId: string;
  tenantId: string;
  seatCount: number;
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  providerRef: string;
}

export interface NormalizedWebhookPayload {
  eventType: PaymentEventType;
  providerRef: string;
  paymentId?: string;
  tenantId?: string;
  seatCount?: number;
  amount?: number;
  currency?: string;
  refundAmount?: number;
  raw: unknown;
}

export interface VerifiedWebhookEvent {
  eventId: string;
  eventType: string;
  payload: NormalizedWebhookPayload;
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(request: Request): Promise<VerifiedWebhookEvent>;
}

export class PaymentConfigurationError extends Error {
  readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export class PaymentVerificationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}
