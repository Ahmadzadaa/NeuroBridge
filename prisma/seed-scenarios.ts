/**
 * Gives the platform's Leadership and Investor Readiness simulations their
 * rounds (content in seed-data/scenarios-leadership-investor.ts).
 *
 * Safe on every deploy: a simulation that already has rounds is left alone,
 * so students' runs and any later edits are never touched.
 *
 *   npx tsx prisma/seed-scenarios.ts
 */
import { PrismaClient } from "@prisma/client";
import { trilingual } from "../src/lib/i18n-content";
import { SCENARIOS } from "./seed-data/scenarios-leadership-investor";

const prisma = new PrismaClient();

// Content lists the strongest choice first; the screen shows choices by
// `order`, so each round gets its own fixed position for them.
const DISPLAY_ORDER = [
  [1, 2, 0],
  [0, 2, 1],
  [2, 0, 1],
  [1, 0, 2],
  [2, 1, 0],
  [0, 1, 2],
];

async function main() {
  for (const scenario of SCENARIOS) {
    const simulation = await prisma.simulation.findUnique({
      where: { key: scenario.key },
      select: { id: true, _count: { select: { rounds: true } } },
    });
    if (!simulation) {
      console.log(`- ${scenario.key}: simulation not found (run prisma/seed.ts first), skipped`);
      continue;
    }
    if (simulation._count.rounds > 0) {
      console.log(`- ${scenario.key}: already has ${simulation._count.rounds} rounds, left as is`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.simulation.update({
        where: { id: simulation.id },
        data: { startCash: scenario.startCash, targetCash: scenario.targetCash, description: trilingual(scenario.description) },
      });
      for (const [i, round] of scenario.rounds.entries()) {
        await tx.simulationRound.create({
          data: {
            simulationId: simulation.id,
            order: i + 1,
            title: trilingual(round.title),
            context: trilingual(round.context),
            choices: {
              create: round.choices.map((choice, j) => ({
                label: trilingual(choice.label),
                detail: trilingual(choice.detail),
                feedback: trilingual(choice.feedback),
                cashDelta: choice.cash,
                satisfactionDelta: choice.sat,
                reputationDelta: choice.rep,
                variance: choice.variance,
                order: DISPLAY_ORDER[i % DISPLAY_ORDER.length][j],
              })),
            },
          },
        });
      }
    });
    console.log(`✓ ${scenario.key}: ${scenario.rounds.length} rounds × 3 choices`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
