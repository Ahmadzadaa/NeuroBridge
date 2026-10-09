"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const COPY = {
  az: {
    title: "Səhifə tapılmadı",
    body: "Axtardığınız səhifə köçürülüb və ya heç vaxt mövcud olmayıb.",
    home: "Panelə qayıt",
  },
  tr: {
    title: "Sayfa bulunamadı",
    body: "Aradığınız sayfa taşınmış ya da hiç var olmamış.",
    home: "Panele dön",
  },
  en: {
    title: "Page not found",
    body: "The page you are looking for has moved, or never existed.",
    home: "Back to dashboard",
  },
} as const;

export default function LocaleNotFound() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) ?? "az";
  const t = COPY[locale as keyof typeof COPY] ?? COPY.az;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-5xl font-bold tracking-tighter text-muted-foreground/40">
        404
      </p>
      <h1 className="mt-4 text-xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t.body}</p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<a href={`/${locale}`} />}
      >
        {t.home}
      </Button>
    </div>
  );
}
