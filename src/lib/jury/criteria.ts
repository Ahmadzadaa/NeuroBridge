import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { JuryError } from "@/lib/jury/jury-error";

/**
 * Evaluation criteria for a programme's jury round.
 *
 * The defaults are a stand-in until the client's criteria document arrives:
 * they are ordinary rows, so each organisation can rename, reweight, add or
 * remove them — up to the moment the first score is given. After that only
 * the names may change, because a changed scale or weight would silently
 * reinterpret scores already entered.
 */

export const DEFAULT_CRITERIA = [
  { nameAz: "Problemin aktuallığı", nameEn: "Problem relevance", nameTr: "Problemin önemi" },
  { nameAz: "Həllin yaradıcılığı", nameEn: "Creativity of the solution", nameTr: "Çözümün yaratıcılığı" },
  { nameAz: "Bazar və istifadəçi potensialı", nameEn: "Market and user potential", nameTr: "Pazar ve kullanıcı potansiyeli" },
  { nameAz: "Təqdimat bacarığı", nameEn: "Presentation", nameTr: "Sunum becerisi" },
  { nameAz: "Komanda / sahibkar uyğunluğu", nameEn: "Team / founder fit", nameTr: "Ekip / girişimci uyumu" },
] as const;

export const DEFAULT_MAX_SCORE = 10;
export const MAX_CRITERIA = 12;

export type CriterionInput = {
  id?: string;
  nameAz: string;
  nameEn: string;
  nameTr: string;
  maxScore: number;
  weight: number;
};

type Db = Prisma.TransactionClient | typeof prisma;

/** The programme's criteria, creating the defaults the first time they are needed. */
export async function ensureProgramCriteria(programId: string, db: Db = prisma) {
  const existing = await db.juryCriterion.findMany({ where: { programId }, orderBy: { order: "asc" } });
  if (existing.length > 0) return existing;
  await db.juryCriterion.createMany({
    data: DEFAULT_CRITERIA.map((c, i) => ({
      programId,
      name: c.nameEn,
      ...c,
      maxScore: DEFAULT_MAX_SCORE,
      weight: 1,
      order: i,
    })),
  });
  return db.juryCriterion.findMany({ where: { programId }, orderBy: { order: "asc" } });
}

export function criterionLabel(
  c: { name: string; nameAz: string | null; nameEn: string | null; nameTr: string | null },
  locale: string
) {
  return localized({ nameAz: c.nameAz ?? c.name, nameEn: c.nameEn ?? c.name, nameTr: c.nameTr ?? c.name }, "name", locale);
}

export async function programHasScores(programId: string, db: Db = prisma) {
  const count = await db.finalistScore.count({ where: { finalist: { programId } } });
  return count > 0;
}

/**
 * Replaces the criteria list. Once scoring has begun only renames are
 * accepted: same rows, same scale, same weights.
 */
export async function saveProgramCriteria(programId: string, items: CriterionInput[]) {
  if (items.length === 0 || items.length > MAX_CRITERIA) {
    throw new JuryError("INVALID_CRITERIA", 400, "Between 1 and 12 criteria are required");
  }

  return prisma.$transaction(async (tx) => {
    const current = await ensureProgramCriteria(programId, tx);

    if (await programHasScores(programId, tx)) {
      const sameShape =
        items.length === current.length &&
        items.every((item, i) => {
          const row = current[i];
          return item.id === row.id && item.maxScore === row.maxScore && item.weight === row.weight;
        });
      if (!sameShape) throw new JuryError("CRITERIA_LOCKED", 409, "Scoring has started; only names can change");
      for (const item of items) {
        await tx.juryCriterion.update({
          where: { id: item.id },
          data: { name: item.nameEn, nameAz: item.nameAz, nameEn: item.nameEn, nameTr: item.nameTr },
        });
      }
    } else {
      await tx.juryCriterion.deleteMany({ where: { programId } });
      await tx.juryCriterion.createMany({
        data: items.map((item, i) => ({
          programId,
          name: item.nameEn,
          nameAz: item.nameAz,
          nameEn: item.nameEn,
          nameTr: item.nameTr,
          maxScore: item.maxScore,
          weight: item.weight,
          order: i,
        })),
      });
    }
    return tx.juryCriterion.findMany({ where: { programId }, orderBy: { order: "asc" } });
  });
}
