"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { routing, type Locale } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
  tr: "🇹🇷 Türkçe",
  en: "🇬🇧 English",
  az: "🇦🇿 Azərbaycanca",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const pathname = usePathname();

  /**
   * A full document load rather than a client transition.
   *
   * Changing locale changes the route segment that owns `<html lang>`, the
   * message bundle and every formatter, so the whole `[locale]` layout is
   * rebuilt either way. Doing it as a soft navigation re-renders that layout on
   * the client, which makes React re-render the theme bootstrap `<script>`
   * next-themes puts there — React never executes a script on a client render
   * and logs a console error about it.
   *
   * Reloading also guarantees `<html lang>` and the font subset match the new
   * language from the first paint instead of being patched afterwards.
   */
  function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    // replace(), not href=: it keeps the previous language out of the back
    // stack — the behaviour router.replace() had — and reads as a call rather
    // than a global assignment, which the React Compiler lint rule rejects.
    window.location.replace(getPathname({ href: pathname, locale: newLocale }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-xl")}
        aria-label={t("changeLanguage")}
      >
        <Globe className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? "bg-accent" : ""}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
