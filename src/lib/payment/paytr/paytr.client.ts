import {
  PaytrApiError,
  type PaytrCardListResponse,
  type PaytrCredentials,
  type PaytrGetTokenRequest,
  type PaytrGetTokenResponse,
  type PaytrRecurringChargeRequest,
  type PaytrRecurringChargeResponse,
  type PaytrStoredCard,
} from "@/lib/payment/paytr/paytr.types";
import {
  buildCardDeleteToken,
  buildCardListToken,
} from "@/lib/payment/paytr/paytr.hash";

const PAYTR_BASE = "https://www.paytr.com";

export const PAYTR_ENDPOINTS = {
  getToken: `${PAYTR_BASE}/odeme/api/get-token`,
  iframe: `${PAYTR_BASE}/odeme/guvenli`,
  charge: `${PAYTR_BASE}/odeme`,
  cardList: `${PAYTR_BASE}/odeme/capi/list`,
  cardDelete: `${PAYTR_BASE}/odeme/capi/delete`,
} as const;

const TIMEOUT_MS = 10_000;
/** Read-only calls may be retried; charges must never be. */
const READ_RETRIES = 2;

export function iframeUrl(token: string): string {
  return `${PAYTR_ENDPOINTS.iframe}/${token}`;
}

function toFormBody(params: Record<string, string | number | undefined>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.append(key, String(value));
  }
  return body;
}

async function postForm<T>(
  url: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: toFormBody(params),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new PaytrApiError(`PayTR returned HTTP ${response.status} for ${url}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PaytrApiError(`PayTR returned a non-JSON response for ${url}`);
    }
  } catch (error) {
    if (error instanceof PaytrApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PaytrApiError(`PayTR request timed out after ${TIMEOUT_MS}ms`);
    }
    throw new PaytrApiError(
      error instanceof Error ? error.message : "PayTR request failed"
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Retry wrapper — only ever used for idempotent read calls. */
async function postFormWithRetry<T>(
  url: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= READ_RETRIES; attempt++) {
    try {
      return await postForm<T>(url, params);
    } catch (error) {
      lastError = error;
      if (attempt < READ_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * iFrame API step 1. Returns the token used to build the iframe URL.
 * The caller is responsible for computing `paytr_token`.
 */
export async function requestIframeToken(
  request: PaytrGetTokenRequest
): Promise<string> {
  const result = await postForm<PaytrGetTokenResponse>(
    PAYTR_ENDPOINTS.getToken,
    request as unknown as Record<string, string | number | undefined>
  );

  if (result.status !== "success") {
    throw new PaytrApiError(
      result.reason ?? result.err_msg ?? "PayTR refused to issue a payment token"
    );
  }

  return result.token;
}

/**
 * Charges a stored card. This is a WRITE — never retry it automatically;
 * a retry must go through the job layer with a fresh merchant_oid.
 */
export async function chargeStoredCard(
  request: PaytrRecurringChargeRequest
): Promise<PaytrRecurringChargeResponse> {
  return postForm<PaytrRecurringChargeResponse>(
    PAYTR_ENDPOINTS.charge,
    request as unknown as Record<string, string | number | undefined>
  );
}

/** Lists the cards vaulted under a utoken. Read-only, so retried. */
export async function listStoredCards(
  credentials: PaytrCredentials,
  utoken: string
): Promise<PaytrStoredCard[]> {
  const result = await postFormWithRetry<PaytrCardListResponse>(
    PAYTR_ENDPOINTS.cardList,
    {
      merchant_id: credentials.merchantId,
      utoken,
      paytr_token: buildCardListToken(credentials, utoken),
    }
  );

  if (!Array.isArray(result)) {
    throw new PaytrApiError(result.err_msg ?? "PayTR could not list stored cards");
  }

  return result;
}

export async function deleteStoredCard(
  credentials: PaytrCredentials,
  utoken: string,
  ctoken: string
): Promise<void> {
  const result = await postForm<{ status: string; err_msg?: string }>(
    PAYTR_ENDPOINTS.cardDelete,
    {
      merchant_id: credentials.merchantId,
      utoken,
      ctoken,
      paytr_token: buildCardDeleteToken(credentials, utoken, ctoken),
    }
  );

  if (result.status !== "success") {
    throw new PaytrApiError(result.err_msg ?? "PayTR could not delete the stored card");
  }
}
