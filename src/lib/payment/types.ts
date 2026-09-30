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
  /** Required by PayTR, which rejects requests without the payer's IP. */
  userIp?: string;
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
  /** The notification body exactly as received, for the provider audit log. */
  rawBody?: string;
  payload: NormalizedWebhookPayload;
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(request: Request): Promise<VerifiedWebhookEvent>;
}

export class PaymentConfigurationError extends Error {
  readonly statusCode = 503;
  readonly code = "PAYMENT_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export class PaymentVerificationError extends Error {
  readonly statusCode = 400;
  readonly code = "PAYMENT_VERIFICATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}
