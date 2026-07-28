import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaytrBasketItem,
  PaytrCredentials,
  PaytrCurrency,
} from "@/lib/payment/paytr/paytr.types";

/**
 * PayTR token/hash calculation.
 *
 * Every concatenation order below is transcribed from the official docs at
 * https://dev.paytr.com. They differ per endpoint and the order is significant
 * — do not refactor them into a shared "generic" builder.
 *
 * These are pure functions: no I/O, no environment access. The merchant key
 * and salt are passed in so they can never be logged from here.
 */

function hmacBase64(payload: string, merchantKey: string): string {
  return createHmac("sha256", merchantKey).update(payload, "utf8").digest("base64");
}

/** Base64-encoded `user_basket`, e.g. [["Seat license", "25.00", 10]]. */
export function encodeBasket(items: PaytrBasketItem[]): string {
  return Buffer.from(JSON.stringify(items), "utf8").toString("base64");
}

export interface IframeTokenInput {
  merchantOid: string;
  userIp: string;
  email: string;
  /** Kuruş. */
  paymentAmount: number;
  basket: string;
  noInstallment: 0 | 1;
  maxInstallment: number;
  currency: PaytrCurrency;
}

/**
 * iFrame API step 1 (`/odeme/api/get-token`).
 *
 * hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount +
 *            user_basket + no_installment + max_installment + currency + test_mode
 * paytr_token = base64(HMAC_SHA256(hash_str + merchant_salt, merchant_key))
 */
export function buildIframeToken(
  credentials: PaytrCredentials,
  input: IframeTokenInput
): string {
  const hashStr =
    credentials.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    String(input.paymentAmount) +
    input.basket +
    String(input.noInstallment) +
    String(input.maxInstallment) +
    input.currency +
    String(credentials.testMode);

  return hmacBase64(hashStr + credentials.merchantSalt, credentials.merchantKey);
}

export interface CallbackHashInput {
  merchantOid: string;
  status: string;
  totalAmount: string;
}

/**
 * iFrame API step 2 (merchant notification URL).
 *
 * hash = base64(HMAC_SHA256(
 *          merchant_oid + merchant_salt + status + total_amount, merchant_key))
 *
 * Note the salt sits in the middle here, unlike every other endpoint.
 */
export function buildCallbackHash(
  credentials: PaytrCredentials,
  input: CallbackHashInput
): string {
  const hashStr =
    input.merchantOid +
    credentials.merchantSalt +
    input.status +
    input.totalAmount;

  return hmacBase64(hashStr, credentials.merchantKey);
}

/**
 * Constant-time comparison of the callback hash. Returning early on the first
 * differing byte would leak the expected hash to a timing attack.
 */
export function verifyCallbackHash(
  credentials: PaytrCredentials,
  input: CallbackHashInput,
  receivedHash: string
): boolean {
  const expected = buildCallbackHash(credentials, input);
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(receivedHash ?? "", "utf8");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Saved-card list (`/odeme/capi/list`).
 *
 * paytr_token = base64(HMAC_SHA256(utoken + merchant_salt, merchant_key))
 */
export function buildCardListToken(
  credentials: PaytrCredentials,
  utoken: string
): string {
  return hmacBase64(utoken + credentials.merchantSalt, credentials.merchantKey);
}

/**
 * Saved-card deletion (`/odeme/capi/delete`).
 *
 * paytr_token = base64(HMAC_SHA256(ctoken + utoken + merchant_salt, merchant_key))
 *
 * Note the ctoken-before-utoken order, which is the reverse of how the two are
 * named everywhere else.
 */
export function buildCardDeleteToken(
  credentials: PaytrCredentials,
  utoken: string,
  ctoken: string
): string {
  return hmacBase64(
    ctoken + utoken + credentials.merchantSalt,
    credentials.merchantKey
  );
}

export interface RecurringTokenInput {
  merchantOid: string;
  userIp: string;
  email: string;
  /** Kuruş. */
  paymentAmount: number;
  paymentType: "card";
  installmentCount: number;
  currency: PaytrCurrency;
  non3d: 0 | 1;
}

/**
 * Recurring charge against a stored card (`/odeme`).
 *
 * hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount +
 *            payment_type + installment_count + currency + test_mode + non_3d
 * paytr_token = base64(HMAC_SHA256(hash_str + merchant_salt, merchant_key))
 */
export function buildRecurringToken(
  credentials: PaytrCredentials,
  input: RecurringTokenInput
): string {
  const hashStr =
    credentials.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    String(input.paymentAmount) +
    input.paymentType +
    String(input.installmentCount) +
    input.currency +
    String(credentials.testMode) +
    String(input.non3d);

  return hmacBase64(hashStr + credentials.merchantSalt, credentials.merchantKey);
}

const MERCHANT_OID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

/**
 * PayTR order ids must be alphanumeric, at most 64 chars, and never reused.
 * Format: BIZ{tenantId}{timestamp}{random} with non-alphanumerics stripped.
 */
export function buildMerchantOid(tenantId: string, now = new Date()): string {
  const cleanTenant = tenantId.replace(/[^A-Za-z0-9]/g, "");
  const timestamp = now.getTime().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  const oid = `BIZ${cleanTenant}${timestamp}${random}`.slice(0, 64);

  if (!MERCHANT_OID_PATTERN.test(oid)) {
    throw new Error(`Generated merchant_oid is not alphanumeric: ${oid}`);
  }
  return oid;
}

export function isValidMerchantOid(oid: string): boolean {
  return MERCHANT_OID_PATTERN.test(oid);
}
