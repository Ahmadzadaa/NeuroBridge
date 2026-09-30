"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Copy is inlined rather than read through next-intl on purpose: an error
 * screen must never be able to throw. A missing translation key raises at
 * render time, which would replace this boundary with the framework's raw
 * error page — exactly what it exists to prevent.
 */
const COPY = {
  az: {
    title: "Nəsə səhv getdi",
    body: "Bu səhifə yüklənə bilmədi. Problem bizim tərəfimizdədir və qeydə alındı.",
    retry: "Yenidən cəhd et",
    home: "Panelə qayıt",
    ref: "İstinad kodu",
  },
  tr: {
    title: "Bir şeyler ters gitti",
    body: "Bu sayfa yüklenemedi. Sorun bizde ve kaydedildi.",
    retry: "Tekrar dene",
    home: "Panele dön",
    ref: "Referans kodu",
  },
  en: {
    title: "Something went wrong",
    body: "This page could not be loaded. The problem is on our side and has been recorded.",
    retry: "Try again",
    home: "Back to dashboard",
    ref: "Reference",
  },
} as const;

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) ?? "az";
  const t = COPY[locale as keyof typeof COPY] ?? COPY.az;

  useEffect(() => {
    // Sentry's Next.js integration already reports this; the log keeps the
    // digest visible in local development where Sentry is disabled.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">
        !
      </div>
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t.body}</p>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          {t.ref}: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>{t.retry}</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={`/${locale}`} />}
        >
          {t.home}
        </Button>
      </div>
    </div>
  );
}
