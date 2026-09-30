import { prisma } from "@/lib/prisma";
import {
  generateProgramSchedule,
  ScheduleError,
  validateJuryDate,
  type ProgramActivity,
  type ScheduleItem,
} from "@/lib/programs/schedule";

export type StoredScheduleItem = ScheduleItem & { id: string | null; editedAt: Date | null };

/**
 * The program's saved plan, or one generated from its dates for programs
 * created before plans were stored. Empty when the program has no dates.
 */
export async function getProgramSchedule(programId: string): Promise<StoredScheduleItem[]> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      programStart: true,
      programEnd: true,
      scheduleItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!program) return [];
  if (program.scheduleItems.length > 0) {
    return program.scheduleItems.map((i) => ({
      id: i.id,
      week: i.week,
      activity: i.activity as ProgramActivity,
      startsOn: i.startsOn,
      endsOn: i.endsOn,
      sortOrder: i.sortOrder,
      editedAt: i.editedAt,
    }));
  }
  if (!program.programStart || !program.programEnd) return [];
  return generateProgramSchedule(program.programStart, program.programEnd).map((i) => ({
    ...i,
    id: null,
    editedAt: null,
  }));
}

export class ScheduleItemNotFoundError extends Error {
  readonly statusCode = 404;
  constructor() {
    super("Schedule item not found");
    this.name = "ScheduleItemNotFoundError";
  }
}

/** University edit: moves a jury presentation to another weekday in the program. */
export async function updateJuryDate(tenantId: string, itemId: string, date: Date) {
  const item = await prisma.programScheduleItem.findFirst({
    where: { id: itemId, program: { tenantId } },
    select: { id: true, activity: true, program: { select: { programStart: true, programEnd: true } } },
  });
  if (!item) throw new ScheduleItemNotFoundError();
  if (item.activity !== "JURY_PRESENTATION" || !item.program.programStart || !item.program.programEnd) {
    throw new ScheduleError("OUT_OF_RANGE");
  }
  const day = validateJuryDate(date, item.program.programStart, item.program.programEnd);
  return prisma.programScheduleItem.update({
    where: { id: item.id },
    data: { startsOn: day, endsOn: day, editedAt: new Date() },
  });
}
