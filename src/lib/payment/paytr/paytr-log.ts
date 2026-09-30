import { createHash } from "crypto";

/**
 * Masking and structured logging for the payment lifecycle.
 *
 * Two things must be true of every line this module emits:
 *
 *  1. It is enough to reconstruct what happened to a payment — which order,
 *     which mode, which step, how long it took, why it failed.
 *  2. It contains nothing that lets the reader forge a request or move money:
 *     no merchant key or salt, no `paytr_token`, no callback `hash`, and no
 *     card data. A log line is copied into tickets, chat and log aggregators,
 *     so "it is only in CloudWatch" is not a control.
 *
 * The callback `hash` is masked even though it is a signature rather than a
 * key: it is valid material for exactly one (merchant_oid, status, amount)
 * triple, so a leaked one lets that notification be replayed against us. What
 * is worth knowing — whether it verified — is recorded as a boolean instead.
 */

export const REDACTED = "[redacted]";

/**
 * Field names whose values must never appear in a log line or in a stored
 * payload. Matched case-insensitively as a substring, so `PAYTR_MERCHANT_KEY`
 * and `merchant_key` are both caught.
 */
const SENSITIVE_FIELD_PATTERN =
  /(merchant_key|merchant_salt|merchant_id|paytr_token|^hash$|_hash$|^token$|password|secret|authorization|cookie|card_number|cardnumber|^pan$|cvv|cvc|expiry|expir_|cc_owner|card_owner)/i;

/** Handles that are not secrets but are still capable of charging a card. */
const HANDLE_FIELD_PATTERN = /(^utoken$|^ctoken$|_token$)/i;

/**
 * A short, stable, non-reversible fingerprint. Two log lines carrying the same
 * fingerprint refer to the same card handle, which is what debugging a failed
 * renewal actually needs — the handle itself never is.
 */
export function fingerprint(value: string): string {
  if (!value) return "none";
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 8);
}

/** Reveals only the length, so a truncated or empty secret is still diagnosable. */
export function maskSecret(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "[empty]";
  return `[redacted:${value.length}]`;
}

/** Card-style masking, for the `cardMask` we store and display. */
export function maskPan(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return REDACTED;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskHandle(value: string | null | undefined): string {
  if (!value) return "[empty]";
  return `tok_${fingerprint(value)}`;
}

/**
 * Redacts a PayTR request or callback payload for logging or storage.
 *
 * The rule is a denylist rather than an allowlist on purpose: the point of
 * keeping the raw callback is to debug fields we did not anticipate, and an
 * allowlist would drop exactly those. Anything matching a sensitive name is
 * replaced; card handles keep a fingerprint so they stay correlatable.
 */
export function sanitizePaytrPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    // Sensitive first: `paytr_token` ends in `_token` but is signing material,
    // not a card handle, and must be redacted rather than fingerprinted.
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      result[key] = typeof value === "string" ? maskSecret(value) : REDACTED;
    } else if (HANDLE_FIELD_PATTERN.test(key)) {
      result[key] = maskHandle(typeof value === "string" ? value : String(value ?? ""));
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parses a form-encoded body and redacts it in one step, for the raw callback
 * body we persist. Returns the text unchanged (but flagged) if it does not
 * parse, so a malformed body is still visible for forensics.
 */
export function sanitizeRawFormBody(rawBody: string): string {
  try {
    const parsed = Object.fromEntries(new URLSearchParams(rawBody).entries());
    if (Object.keys(parsed).length === 0) {
      return JSON.stringify({ unparsed: true, length: rawBody.length });
    }
    return JSON.stringify(sanitizePaytrPayload(parsed));
  } catch {
    return JSON.stringify({ unparsed: true, length: rawBody.length });
  }
}

export type PaytrLogLevel = "info" | "warn" | "error";

/**
 * Every stage a payment can reach. Kept as a closed union so a dashboard or a
 * log filter can be written against a known set of names.
 */
export type PaytrLogEvent =
  | "checkout.token_requested"
  | "checkout.token_issued"
  | "checkout.token_failed"
  | "callback.received"
  | "callback.rejected"
  | "callback.duplicate"
  | "callback.processed"
  | "callback.failed"
  | "callback.unmatched"
  | "recurring.charge_started"
  | "recurring.charge_succeeded"
  | "recurring.charge_declined"
  | "recurring.charge_failed"
  | "recurring.skipped";

export interface PaytrLogFields {
  merchantOid?: string;
  invoiceId?: string;
  tenantId?: string;
  /** Integer kuruş — never a formatted currency string. */
  amount?: number;
  currency?: string;
  /** sandbox | live, or "invalid"/"unknown" when it could not be read. */
  mode?: string;
  testMode?: 0 | 1;
  hashValid?: boolean;
  durationMs?: number;
  outcome?: string;
  reason?: string;
  attemptNo?: number;
  cardFingerprint?: string;
  [key: string]: unknown;
}

/**
 * One JSON object per line. CloudWatch Logs Insights and every other log
 * pipeline in use here parse that without a shipper-side rule, and a human
 * reading `docker logs` can still follow it.
 */
export function logPaytr(
  level: PaytrLogLevel,
  event: PaytrLogEvent,
  fields: PaytrLogFields = {}
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    component: "paytr",
    event,
    ...sanitizePaytrPayload(fields),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
