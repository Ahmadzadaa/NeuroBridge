/**
 * PayTR wire types.
 *
 * Field names mirror the official documentation at https://dev.paytr.com
 * exactly — they are snake_case on purpose. Do not "tidy" them.
 */

export interface PaytrCredentials {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  /** 1 while integrating against the sandbox. */
  testMode: 0 | 1;
}

/** One line of the base64-encoded `user_basket` payload: [name, price, qty]. */
export type PaytrBasketItem = [string, string, number];

/**
 * `POST https://www.paytr.com/odeme/api/get-token` (iFrame API, step 1).
 * `payment_amount` is in kuruş — PayTR expects the minor unit as an integer.
 */
export interface PaytrGetTokenRequest {
  merchant_id: string;
  user_ip: string;
  merchant_oid: string;
  email: string;
  payment_amount: number;
  paytr_token: string;
  user_basket: string;
  debug_on: 0 | 1;
  no_installment: 0 | 1;
  max_installment: number;
  currency: PaytrCurrency;
  test_mode: 0 | 1;
  merchant_ok_url: string;
  merchant_fail_url: string;
  user_name?: string;
  user_address?: string;
  user_phone?: string;
  timeout_limit?: number;
  lang?: "tr" | "en";
}

export type PaytrCurrency = "TL" | "EUR" | "USD" | "GBP" | "RUB";

export type PaytrGetTokenResponse =
  | { status: "success"; token: string }
  | { status: "failed"; reason?: string; err_msg?: string };

/**
 * Fields PayTR POSTs to the notification URL (iFrame API, step 2).
 * `total_amount` is the collected amount ×100, i.e. kuruş.
 */
export interface PaytrCallbackPayload {
  merchant_oid: string;
  status: "success" | "failed";
  total_amount: string;
  hash: string;
  payment_type?: string;
  currency?: string;
  payment_amount?: string;
  test_mode?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  /** Present once the customer's card has been vaulted. */
  utoken?: string;
}

/** `POST https://www.paytr.com/odeme/capi/list` — saved cards for a utoken. */
export interface PaytrStoredCard {
  ctoken: string;
  last_4: string;
  month: string;
  year: string;
  require_cvv: 0 | 1;
  c_bank?: string;
  c_brand?: string;
  c_type?: "credit" | "debit";
  schema?: string;
}

export type PaytrCardListResponse =
  | PaytrStoredCard[]
  | { status: "error"; err_msg: string };

/**
 * `POST https://www.paytr.com/odeme` with utoken + ctoken (recurring charge).
 * This path is Non3D — the merchant account must have Non3D enabled.
 */
export interface PaytrRecurringChargeRequest {
  merchant_id: string;
  paytr_token: string;
  user_ip: string;
  merchant_oid: string;
  email: string;
  payment_type: "card";
  payment_amount: number;
  installment_count: number;
  currency: PaytrCurrency;
  test_mode: 0 | 1;
  non_3d: 1;
  utoken: string;
  ctoken: string;
  merchant_ok_url: string;
  merchant_fail_url: string;
  user_name: string;
  user_address: string;
  user_phone: string;
  user_basket: string;
  recurring_payment: 1;
  debug_on?: 0 | 1;
}

export type PaytrRecurringChargeResponse =
  | { status: "success" }
  | { status: "wait_callback" }
  | {
      status: "failed";
      err_msg?: string;
      reason?: string;
      failed_reason_code?: string;
      failed_reason_msg?: string;
    };

export class PaytrApiError extends Error {
  readonly statusCode = 502;
  readonly reasonCode?: string;

  constructor(message: string, reasonCode?: string) {
    super(message);
    this.name = "PaytrApiError";
    this.reasonCode = reasonCode;
  }
}
