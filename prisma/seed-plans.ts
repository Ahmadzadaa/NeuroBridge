import { PrismaClient } from "@prisma/client";

/**
 * The three subscription tiers the public pricing page renders.
 *
 * ⚠️  THE PRICES BELOW ARE PLACEHOLDERS FOR THE DEMO.
 *
 * They were not derived from competitor research or from any market analysis —
 * they scale the 25 ₺ figure that was already in `seed-demo.ts` into a normal
 * three-tier shape so the page has something realistic to render. Replace them
 * with real commercial figures before this is shown to a prospect.
 *
 * Names stay in English on purpose: `planFeatureKey()` slugifies the name to
 * look up marketing copy (`Professional` → `professional`), and non-ASCII
 * letters would be stripped out of the slug.
 *
 *   npx tsx prisma/seed-plans.ts
 */

const prisma = new PrismaClient();

/** Integer minor units — kuruş for TRY, as the rest of billing expects. */
const PLANS = [
  {
    id: "plan-starter",
    name: "Starter",
    pricePerSeatMonthly: 2500,
    minSeats: 25,
    trialDays: 14,
  },
  {
    id: "plan-standard", // Pre-existing row; a demo subscription references it.
    name: "Professional",
    pricePerSeatMonthly: 4500,
    minSeats: 100,
    trialDays: 14,
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    pricePerSeatMonthly: 7500,
    minSeats: 250,
    trialDays: 0,
  },
] as const;

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      // Upsert rather than create: `plan-standard` already exists and is
      // referenced by the demo tenant's subscription, so it must be updated in
      // place, never deleted. Existing subscriptions keep their own price
      // snapshot, so re-pricing a plan does not re-price anyone retroactively.
      update: {
        name: plan.name,
        pricePerSeatMonthly: plan.pricePerSeatMonthly,
        minSeats: plan.minSeats,
        trialDays: plan.trialDays,
        currency: "TRY",
        isActive: true,
      },
      create: { ...plan, currency: "TRY", isActive: true },
    });
    console.log(
      `  ✓ ${plan.name.padEnd(13)} ${(plan.pricePerSeatMonthly / 100).toFixed(0)} ₺/seat · min ${plan.minSeats}`,
    );
  }

  const active = await prisma.plan.count({ where: { isActive: true } });
  console.log(`\n${active} active plan(s). Prices are demo placeholders.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
