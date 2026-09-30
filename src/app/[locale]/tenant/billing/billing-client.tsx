"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SEAT_PACKAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function BillingClient() {
  const t = useTranslations("tenant.billing");
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SEAT_PACKAGES.map((pkg) => (
          <Card key={pkg.id} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold">{pkg.seats}</h3>
              <p className="text-sm text-muted-foreground">{t("seatsUnit")}</p>
              <p className="mt-2 text-lg font-semibold">
                ₺{pkg.pricePerSeat} / {t("perSeat")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("totalLabel")} ₺{pkg.seats * pkg.pricePerSeat}
              </p>
              <Button
                className="mt-4 w-full rounded-xl"
                disabled={loadingPackage === pkg.seats}
                onClick={() => purchase(pkg.seats)}
              >
                {loadingPackage === pkg.seats ? t("purchasing") : t("purchase")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
