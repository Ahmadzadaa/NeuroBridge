"use client";

import { useState } from "react";
import { SEAT_PACKAGES } from "@/lib/constants";
import type { PaymentProvider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface BillingClientProps {
  defaultProvider: PaymentProvider;
}

export function BillingClient({ defaultProvider }: BillingClientProps) {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>(defaultProvider);

  async function purchase(seatCount: number) {
    setLoadingPackage(seatCount);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatCount, provider }),
    });
    setLoadingPackage(null);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Checkout failed");
      return;
    }

    const data = await res.json();
    window.location.href = data.checkoutUrl;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["STRIPE", "PAYRIFF", "IYZICO"] as PaymentProvider[]).map((item) => (
          <Button
            key={item}
            variant={provider === item ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setProvider(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SEAT_PACKAGES.map((pkg) => (
          <Card key={pkg.id} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold">{pkg.seats}</h3>
              <p className="text-sm text-muted-foreground">seats</p>
              <p className="mt-2 text-lg font-semibold">₺{pkg.pricePerSeat}/seat</p>
              <p className="text-sm text-muted-foreground">
                Total ₺{pkg.seats * pkg.pricePerSeat}
              </p>
              <Button
                className="mt-4 w-full rounded-xl"
                disabled={loadingPackage === pkg.seats}
                onClick={() => purchase(pkg.seats)}
              >
                {loadingPackage === pkg.seats ? "..." : "Purchase"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
