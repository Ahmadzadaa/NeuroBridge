import type { PaymentProvider } from "@/lib/types";
import type { PaymentProviderAdapter } from "@/lib/payment/types";
import { createPaytrProvider } from "@/lib/payment/paytr-provider";

/**
 * PayTR is currently the only payment provider. The registry indirection is
 * kept deliberately: adding another provider means implementing
 * `PaymentProviderAdapter` and adding one case below, with no changes to the
 * billing services or routes.
 */
const providers: Partial<Record<PaymentProvider, PaymentProviderAdapter>> = {};

export function getPaymentProvider(name: PaymentProvider): PaymentProviderAdapter {
  if (!providers[name]) {
    switch (name) {
      case "PAYTR":
        providers[name] = createPaytrProvider();
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
