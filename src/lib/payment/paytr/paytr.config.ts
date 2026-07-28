import { PaymentConfigurationError } from "@/lib/payment/types";
import type { PaytrCredentials } from "@/lib/payment/paytr/paytr.types";

/**
 * PayTR credential loading.
 *
 * These three values are secrets: they must never be logged, echoed in an API
 * response, or attached to a Sentry event (see `sentry.*.config.ts` scrubbing).
 * Only key *names* belong in `.env.example`.
 */

export function isPaytrConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.PAYTR_MERCHANT_ID && env.PAYTR_MERCHANT_KEY && env.PAYTR_MERCHANT_SALT
  );
}

export function getPaytrCredentials(
  env: NodeJS.ProcessEnv = process.env
): PaytrCredentials {
  const merchantId = env.PAYTR_MERCHANT_ID;
  const merchantKey = env.PAYTR_MERCHANT_KEY;
  const merchantSalt = env.PAYTR_MERCHANT_SALT;

  const missing = [
    !merchantId && "PAYTR_MERCHANT_ID",
    !merchantKey && "PAYTR_MERCHANT_KEY",
    !merchantSalt && "PAYTR_MERCHANT_SALT",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new PaymentConfigurationError(
      `PayTR is not configured: ${missing.join(", ")} missing`
    );
  }

  return {
    merchantId: merchantId!,
    merchantKey: merchantKey!,
    merchantSalt: merchantSalt!,
    testMode: env.PAYTR_TEST_MODE === "1" ? 1 : 0,
  };
}

/**
 * Recurring charges run Non3D, which PayTR enables per merchant account.
 * When the account lacks that permission the automatic renewal path cannot
 * work, so it is gated behind an explicit opt-in rather than failing monthly
 * in the background.
 */
export function isRecurringEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PAYTR_NON3D_ENABLED === "1";
}
