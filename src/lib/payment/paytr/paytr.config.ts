import { PaymentConfigurationError } from "@/lib/payment/types";
import type { PaytrCredentials } from "@/lib/payment/paytr/paytr.types";

/**
 * PayTR credential loading, split by mode.
 *
 * These values are secrets: they must never be logged, echoed in an API
 * response, or attached to a Sentry event (see `sentry.*.config.ts` scrubbing).
 * Only key *names* belong in `.env.example`.
 *
 * Sandbox and live credentials live in **separate variables** rather than one
 * triple that is swapped at deploy time. The failure this prevents is the
 * expensive one: a deploy that still carries sandbox keys silently accepts
 * payments that never settle, and a deploy that carries live keys while the
 * team believes it is testing takes real money from real cards.
 */

export type PaytrMode = "sandbox" | "live";

export const PAYTR_MODES: readonly PaytrMode[] = ["sandbox", "live"];

const MODE_VARS: Record<PaytrMode, { id: string; key: string; salt: string }> = {
  sandbox: {
    id: "PAYTR_SANDBOX_MERCHANT_ID",
    key: "PAYTR_SANDBOX_MERCHANT_KEY",
    salt: "PAYTR_SANDBOX_MERCHANT_SALT",
  },
  live: {
    id: "PAYTR_LIVE_MERCHANT_ID",
    key: "PAYTR_LIVE_MERCHANT_KEY",
    salt: "PAYTR_LIVE_MERCHANT_SALT",
  },
};

/** Pre-split variable names, still honoured in sandbox mode only. */
const LEGACY_VARS = {
  id: "PAYTR_MERCHANT_ID",
  key: "PAYTR_MERCHANT_KEY",
  salt: "PAYTR_MERCHANT_SALT",
} as const;

/**
 * Defaults to sandbox. An unset mode must never mean "live": forgetting a
 * variable should cost a failed test payment, not a real charge.
 */
export function getPaytrMode(env: NodeJS.ProcessEnv = process.env): PaytrMode {
  const raw = (env.PAYTR_MODE ?? "sandbox").trim().toLowerCase();
  if (raw !== "sandbox" && raw !== "live") {
    throw new PaymentConfigurationError(
      `PAYTR_MODE must be "sandbox" or "live" (got "${env.PAYTR_MODE}")`
    );
  }
  return raw;
}

export function isLiveMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPaytrMode(env) === "live";
}

/**
 * Live mode reads only `PAYTR_LIVE_*`. The legacy unprefixed triple is
 * accepted in sandbox mode for backwards compatibility, but never in live:
 * nothing about a variable named `PAYTR_MERCHANT_KEY` says whether it holds a
 * sandbox or a production key, and guessing is how test keys reach production.
 */
export function missingPaytrVars(
  env: NodeJS.ProcessEnv = process.env,
  mode: PaytrMode = getPaytrMode(env)
): string[] {
  const vars = MODE_VARS[mode];
  const allowLegacy = mode === "sandbox";

  return (["id", "key", "salt"] as const)
    .filter((field) => {
      if (env[vars[field]]) return false;
      if (allowLegacy && env[LEGACY_VARS[field]]) return false;
      return true;
    })
    .map((field) => vars[field]);
}

export function isPaytrConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    return missingPaytrVars(env).length === 0;
  } catch {
    // An invalid PAYTR_MODE is a configuration error, not a "configured" state.
    return false;
  }
}

/**
 * `test_mode` is derived from the mode rather than set by hand, so the two can
 * never disagree. The one override that is kept — `PAYTR_TEST_MODE=1` while
 * live — is the go-live rehearsal: real credentials, real callback URL, no
 * money moved. See docs/paytr-golive-checklist.md.
 */
function resolveTestMode(env: NodeJS.ProcessEnv, mode: PaytrMode): 0 | 1 {
  if (mode === "sandbox") return 1;
  return env.PAYTR_TEST_MODE === "1" ? 1 : 0;
}

export function getPaytrCredentials(
  env: NodeJS.ProcessEnv = process.env
): PaytrCredentials {
  const mode = getPaytrMode(env);
  const missing = missingPaytrVars(env, mode);

  if (missing.length > 0) {
    throw new PaymentConfigurationError(
      `PayTR is not configured for ${mode} mode: ${missing.join(", ")} missing`
    );
  }

  const vars = MODE_VARS[mode];
  const allowLegacy = mode === "sandbox";
  const read = (field: "id" | "key" | "salt"): string =>
    env[vars[field]] ?? (allowLegacy ? env[LEGACY_VARS[field]] : undefined) ?? "";

  return {
    mode,
    merchantId: read("id"),
    merchantKey: read("key"),
    merchantSalt: read("salt"),
    testMode: resolveTestMode(env, mode),
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

/**
 * The URL PayTR must be given in the merchant panel as the notification URL.
 * Derived from `NEXT_PUBLIC_APP_URL` so the checklist and the smoke test read
 * the same value the application would actually receive callbacks on.
 */
export function getCallbackUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/billing/paytr/callback`;
}
