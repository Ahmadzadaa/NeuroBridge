"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Copy for the three supported locales, inlined for the same reason the rest
 * of this file is: next-intl is not available here.
 */
const COPY = {
  az: {
    title: "Sistem xətası",
    body: "Tətbiq yüklənə bilmədi. Bir neçə saniyədən sonra yenidən cəhd edin.",
    retry: "Yenidən cəhd et",
  },
  tr: {
    title: "Sistem hatası",
    body: "Uygulama yüklenemedi. Birkaç saniye sonra tekrar deneyin.",
    retry: "Tekrar dene",
  },
  en: {
    title: "System error",
    body: "The application failed to load. Please try again in a moment.",
    retry: "Try again",
  },
} as const;

type Locale = keyof typeof COPY;

const subscribeToNothing = () => () => {};
const serverLocale = (): Locale => "az";

/** The root layout never ran, so the locale has to come off the URL itself. */
function localeFromPath(): Locale {
  if (typeof window === "undefined") return "az";
  const segment = window.location.pathname.split("/")[1];
  return segment in COPY ? (segment as Locale) : "az";
}

/**
 * Last-resort boundary: catches failures in the root layout itself.
 *
 * This replaces the entire document, so it must render its own <html> and
 * <body> and may not rely on providers, fonts, i18n or the design system —
 * none of them are guaranteed to have mounted. Styling is therefore inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The URL is a browser-only value, so it is read through the store hook: the
  // server snapshot stays "az" and the client swaps in the real locale after
  // hydration, without a mismatch. The boundary never navigates, so there is
  // nothing to subscribe to.
  const locale = useSyncExternalStore(
    subscribeToNothing,
    localeFromPath,
    serverLocale,
  );
  const t = COPY[locale];

  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F7F8FC",
          color: "#111827",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: "14px", color: "#4B5563", margin: "0 0 20px" }}>
            {t.body}
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                color: "#9CA3AF",
                margin: "0 0 20px",
              }}
            >
              {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              background: "#4F46E5",
              color: "#fff",
              border: 0,
              borderRadius: "9px",
              padding: "9px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
