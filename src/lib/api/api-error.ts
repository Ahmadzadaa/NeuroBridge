"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

/** Shape of the JSON body `apiErrorResponse` returns. */
export interface ApiErrorBody {
  error?: string;
  code?: string;
}

/**
 * Turns an error response into a sentence in the reader's language.
 *
 * The server's `error` field is deliberately never displayed. It is written in
 * English for logs and for developers, and components used to fall back to it
 * (`data?.error ?? t("error")`), which meant the precise message a Turkish or
 * Azerbaijani admin saw was English — the localized fallback fired only when
 * the server said nothing at all. The stable `code` is what gets translated
 * instead, and anything without a known code becomes one honest generic line.
 */
export function useApiErrorMessage() {
  const t = useTranslations("errors");

  return useCallback(
    (body: unknown): string => {
      const code = (body as ApiErrorBody | null | undefined)?.code;
      return code && t.has(code) ? t(code) : t("generic");
    },
    [t]
  );
}
