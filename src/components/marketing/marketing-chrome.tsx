"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/features", key: "features" },
  { href: "/pricing", key: "pricing" },
  { href: "/contact", key: "contact" },
] as const;

export function MarketingHeader() {
  const t = useTranslations("marketing.nav");
  const brand = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            B
          </span>
          <span className="text-[17px]">{brand("appName")}</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="rounded-xl">
              {t("signIn")}
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="sm" className="rounded-xl">
              {t("requestDemo")}
            </Button>
          </Link>

          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground md:hidden"
            aria-expanded={open}
            aria-label={t("toggleMenu")}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground"
          >
            {t("signIn")}
          </Link>
          <div className="flex items-center gap-1 px-1 pt-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}

export function MarketingFooter() {
  const t = useTranslations("marketing.footer");
  const tn = useTranslations("marketing.nav");
  const brand = useTranslations("common");

  return (
    <footer className="border-t border-border/60 bg-subtle/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              B
            </span>
            <span>{brand("appName")}</span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] leading-[1.7] text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-foreground">{t("product")}</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
            <li>
              <Link href="/features" className="hover:text-foreground">
                {tn("features")}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                {tn("pricing")}
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                {tn("signIn")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-foreground">{t("company")}</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
            <li>
              <Link href="/contact" className="hover:text-foreground">
                {tn("contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-foreground">{t("legal")}</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-foreground">
                {t("terms")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-5">
        <p className="mx-auto max-w-6xl text-[12px] text-muted-foreground">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
