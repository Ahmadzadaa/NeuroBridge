import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { CalculatorService } from "@/app/[locale]/(marketing)/pricing/pricing-calculator";

/** Active services with their tiers, named in the reader's language, for the price calculator. */
export async function getCalculatorServices(locale: string): Promise<CalculatorService[]> {
  const [t, services] = await Promise.all([
    getTranslations({ locale, namespace: "pricing" }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        tiers: {
          orderBy: { minParticipants: "asc" },
          select: { minParticipants: true, maxParticipants: true, pricePerParticipant: true, currency: true },
        },
      },
    }),
  ]);
  return services.map((s) => ({ ...s, name: t.has(`services.${s.code}`) ? t(`services.${s.code}`) : s.name }));
}
