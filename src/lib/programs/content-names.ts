import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";

type Translator = { has: (key: string) => boolean; (key: string): string };

/** "finance_training" → "Finance training"; last resort when nothing names the key. */
function humanize(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Display names for what a programme contains, in the reader's language.
 *
 * Programme rows store content as keys. Trainings and simulations are DB rows
 * with their own trilingual titles, which are the source of truth; the message
 * catalogue only knows the builder's short keys ("finance", not
 * "finance_training"), so it is a fallback, and a readable form of the key is
 * the last one — a raw snake_case key must never reach the page.
 */
export async function programContentNames(
  program: { programTrainings: { trainingType: string }[]; programSimulations: { simulationType: string }[] },
  locale: string,
  messages: { trainings: Translator; simulations: Translator }
): Promise<string[]> {
  const trainingKeys = program.programTrainings.map((p) => p.trainingType);
  const simulationKeys = program.programSimulations.map((p) => p.simulationType);

  const [trainings, simulations] = await Promise.all([
    trainingKeys.length
      ? prisma.training.findMany({ where: { key: { in: trainingKeys } }, select: { key: true, titleTr: true, titleEn: true, titleAz: true } })
      : [],
    simulationKeys.length
      ? prisma.simulation.findMany({ where: { key: { in: simulationKeys } }, select: { key: true, nameTr: true, nameEn: true, nameAz: true } })
      : [],
  ]);

  const fromMessages = (t: Translator, key: string) => {
    const short = key.replace(/_(training|sim|simulation)$/, "");
    if (t.has(key)) return t(key);
    if (t.has(short)) return t(short);
    return humanize(short);
  };

  return [
    ...trainingKeys.map((key) => {
      const row = trainings.find((r) => r.key === key);
      return row ? localized(row, "title", locale) : fromMessages(messages.trainings, key);
    }),
    ...simulationKeys.map((key) => {
      const row = simulations.find((r) => r.key === key);
      return row ? localized(row, "name", locale) : fromMessages(messages.simulations, key);
    }),
  ];
}
