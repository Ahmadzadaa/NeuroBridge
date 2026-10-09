"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { SEAT_PACKAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/ios";

/** Extra seat packages, paid through PayTR. */
export function BillingClient() {
  const t = useTranslations("tenant.billing");
  const locale = useLocale();
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const money = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  });

  async function purchase(seatCount: number) {
    setLoadingPackage(seatCount);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount, provider: "PAYTR" }),
      });

      if (!res.ok) {
        toast.error(t("checkoutFailed"));
        return;
      }

      const data = await res.json();
      // assign() rather than setting location.href: same navigation, but it is
      // a method call instead of mutating a value owned outside the component.
      window.location.assign(data.checkoutUrl);
    } catch {
      toast.error(t("checkoutFailed"));
    } finally {
      setLoadingPackage(null);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
      {SEAT_PACKAGES.map((pkg, i) => (
        <div
          key={pkg.id}
          className={`flex flex-col rounded-[22px] bg-card p-5 ring-1 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ${
            i === 1 ? "ring-2 ring-primary/50" : "ring-border/60"
          }`}
        >
          <IconTile icon={Users} tone={i === 0 ? "sky" : i === 1 ? "indigo" : "violet"} />
          <p className="mt-4 text-[32px] font-bold leading-none tracking-[-1px] tabular-nums">{pkg.seats}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("seatsUnit")}</p>
          <p className="mt-4 text-[15px] font-semibold">
            {money.format(pkg.pricePerSeat)} <span className="font-normal text-muted-foreground">/ {t("perSeat")}</span>
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t("totalLabel")} {money.format(pkg.seats * pkg.pricePerSeat)}
          </p>
          <Button
            className="mt-5 w-full"
            variant={i === 1 ? "default" : "outline"}
            disabled={loadingPackage === pkg.seats}
            onClick={() => purchase(pkg.seats)}
          >
            {loadingPackage === pkg.seats ? t("purchasing") : t("purchase")}
          </Button>
        </div>
      ))}
    </div>
  );
}
