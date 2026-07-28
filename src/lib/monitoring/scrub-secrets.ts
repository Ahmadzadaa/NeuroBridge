/**
 * Redacts credentials from anything on its way to an external service
 * (currently Sentry).
 *
 * PayTR's merchant key and salt are the signing material for every payment
 * hash — a single leaked breadcrumb or request body would let someone forge
 * callbacks. They must never leave this process.
 */

const SECRET_KEY_PATTERN =
  /(paytr_token|merchant_key|merchant_salt|PAYTR_MERCHANT_KEY|PAYTR_MERCHANT_SALT|PAYTR_MERCHANT_ID|authorization|cookie|password|passwordHash|secret|token|utoken|ctoken|card_number|cvv|expiry_month|expiry_year|cc_owner)/i;

export const REDACTED = "[redacted]";

/** Values of matching keys are replaced, at any depth, cycles included. */
export function scrubSecrets<T>(input: T, seen = new WeakSet<object>()): T {
  if (input === null || typeof input !== "object") return input;

  const target = input as unknown as object;
  if (seen.has(target)) return input;
  seen.add(target);

  if (Array.isArray(input)) {
    return input.map((item) => scrubSecrets(item, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    result[key] = SECRET_KEY_PATTERN.test(key)
      ? REDACTED
      : scrubSecrets(value, seen);
  }
  return result as unknown as T;
}

interface ScrubbableEvent {
  request?: { data?: unknown; headers?: unknown; cookies?: unknown };
  extra?: unknown;
  contexts?: unknown;
  breadcrumbs?: unknown;
}

/** Sentry `beforeSend` / `beforeSendTransaction` hook. */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    event.request = scrubSecrets(event.request);
  }
  if (event.extra) {
    event.extra = scrubSecrets(event.extra);
  }
  if (event.contexts) {
    event.contexts = scrubSecrets(event.contexts);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = scrubSecrets(event.breadcrumbs);
  }
  return event;
}
