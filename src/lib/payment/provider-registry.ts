import type { PaymentProvider } from "@/lib/types";
import type { PaymentProviderAdapter } from "@/lib/payment/types";
import { createStripeProvider } from "@/lib/payment/stripe-provider";
import { createPayriffProvider } from "@/lib/payment/payriff-provider";
import { createIyzicoProvider } from "@/lib/payment/iyzico-provider";

const providers: Partial<Record<PaymentProvider, PaymentProviderAdapter>> = {};

export function getPaymentProvider(name: PaymentProvider): PaymentProviderAdapter {
  if (!providers[name]) {
    switch (name) {
      case "STRIPE":
        providers[name] = createStripeProvider();
        break;
      case "PAYRIFF":
        providers[name] = createPayriffProvider();
        break;
      case "IYZICO":
        providers[name] = createIyzicoProvider();
        break;
      default:
        throw new Error(`Unsupported payment provider: ${name}`);
    }
  }
  return providers[name]!;
}

export function resetPaymentProvidersForTests(): void {
  for (const key of Object.keys(providers) as PaymentProvider[]) {
    delete providers[key];
  }
}

export function registerPaymentProvider(
  name: PaymentProvider,
  adapter: PaymentProviderAdapter
): void {
  providers[name] = adapter;
}
