import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { createProgramSchema } from "@/lib/validation/schemas";
import { generateProgramSchedule, toCalendarDate } from "@/lib/programs/schedule";

type ProgramInput = z.infer<typeof createProgramSchema>;

export class ProgramAdminError extends Error {
  constructor(
    public readonly code: "UNKNOWN_TRAINING" | "TENANT_NOT_FOUND" | "PROGRAM_NOT_FOUND",
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ProgramAdminError";
  }
}

/** The scalar columns the builder edits, shared by create and update. */
export function programColumns(body: ProgramInput) {
  return {
    name: body.name,
    description: body.description ?? null,
    type: body.type,
    applicationStart: body.applicationStart,
    applicationEnd: body.applicationEnd,
    simulationStart: body.simulationStart ?? null,
    simulationEnd: body.simulationEnd ?? null,
    participantLimit: body.participantLimit,
    programStart: body.programStart ? toCalendarDate(body.programStart) : null,
    programEnd: body.programEnd ? toCalendarDate(body.programEnd) : null,
    certificateName: body.certificateName ?? null,
    finalistCount: body.finalistCount ?? null,
    juryEnabled: body.juryEnabled,
  };
}

/** Throws ScheduleError (400) for a range too short for six weeks. */
export function programSchedule(body: ProgramInput) {
  return body.programStart && body.programEnd ? generateProgramSchedule(body.programStart, body.programEnd) : [];
}

/**
 * Trainings are catalogue rows; a programme must name them by their real key
 * (e.g. finance_training), or students are refused access to them later.
 */
export async function assertTrainingKeys(tx: Prisma.TransactionClient, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const found = await tx.training.findMany({ where: { key: { in: keys } }, select: { key: true } });
  const missing = keys.filter((k) => !found.some((f) => f.key === k));
  if (missing.length > 0) {
    throw new ProgramAdminError("UNKNOWN_TRAINING", 400, `Unknown training: ${missing.join(", ")}`);
  }
}

/**
 * Trainings the builder offers, named in the reader's language. Keys ending in
 * _sim are simulation-owned unit sets (e.g. idea_development_sim), reached
 * through their simulation rather than picked here.
 */
export async function trainingCatalogue(
  db: Prisma.TransactionClient | { training: Prisma.TransactionClient["training"] },
  locale: string
) {
  const rows = await db.training.findMany({
    where: { NOT: { key: { endsWith: "_sim" } } },
    select: { key: true, titleTr: true, titleEn: true, titleAz: true },
    orderBy: { key: "asc" },
  });
  const pick = (r: (typeof rows)[number]) => (locale === "az" ? r.titleAz : locale === "en" ? r.titleEn : r.titleTr);
  return rows.map((r) => ({ key: r.key, label: pick(r) || r.key }));
}
