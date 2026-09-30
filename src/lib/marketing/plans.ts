import { prisma } from "@/lib/prisma";

/**
 * Plans for the public pricing pages.
 *
 * Read from the `plans` table rather than from a constant, so the price a
 * prospect is quoted is the price billing will actually charge. The marketing
 * side of a plan — its feature bullets, its "most popular" badge — is not in
 * the database and does not belong there; that copy lives in the message files
 * keyed by plan id, and `featureKey` is how a row is matched to it.
 *
 * `/api/billing/plans` cannot be reused here: it requires `billing:read`, and
 * these pages are public. Reading through Prisma in a server component keeps
 * the data private-by-default — only the fields below ever reach the browser.
 */

export interface PublicPlan {
  id: string;
  name: string;
  /** Integer minor units (kuruş for TRY). */
  pricePerSeatMonthly: number;
  currency: string;
  minSeats: number;
  trialDays: number;
  /**
   * Message-file key for this plan's marketing copy. Derived from the name so
   * that adding a plan row does not require a code change — only a matching
   * block in `marketing.pricing.plans.*`.
   */
  featureKey: string;
}

const INTL_TAG: Record<string, string> = {
  az: "az-AZ",
  tr: "tr-TR",
  en: "en-GB",
};

export function planFeatureKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "plan";
}

export async function listPublicPlans(): Promise<PublicPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { pricePerSeatMonthly: "asc" },
    select: {
      id: true,
      name: true,
      pricePerSeatMonthly: true,
      currency: true,
      minSeats: true,
      trialDays: true,
    },
  });

  return plans.map((plan) => ({ ...plan, featureKey: planFeatureKey(plan.name) }));
}

/** Formats integer minor units as currency, e.g. 2500 -> "₺25,00". */
export function formatPlanPrice(
  plan: Pick<PublicPlan, "pricePerSeatMonthly" | "currency">,
  locale: string,
): string {
  return new Intl.NumberFormat(INTL_TAG[locale] ?? INTL_TAG.az, {
    style: "currency",
    currency: plan.currency,
    // Seat prices are round numbers in practice, and "₺25" reads better on a
    // pricing card than "₺25,00".
    minimumFractionDigits: plan.pricePerSeatMonthly % 100 === 0 ? 0 : 2,
  }).format(plan.pricePerSeatMonthly / 100);
}
