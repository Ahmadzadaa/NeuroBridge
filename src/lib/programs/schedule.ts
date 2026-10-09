/**
 * The 6-week student program plan.
 *
 * Dates are calendar days: only the UTC year/month/day of an input is used,
 * and every output is UTC midnight. The span is split into six near-equal
 * weeks, so a standard 42-day program gets exact 7-day weeks and a shorter or
 * longer one is stretched proportionally.
 */

export const PROGRAM_WEEKS = [
  ["BASELINE_TESTS", "CREATIVE_THINKING"],
  ["MULTIPLE_PERSPECTIVES", "PROBLEM_DISCOVERY"],
  ["UNDERSTANDING_USERS", "INSIGHT_OPPORTUNITY"],
  ["IDEA_GENERATION", "IDEA_EVALUATION"],
  ["VALUE_PROPOSITION", "FINAL_PROJECT"],
  ["FINAL_SUBMISSION", "PLATFORM_EVALUATION", "FINALIST_SELECTION", "JURY_PRESENTATION"],
] as const;

export type ProgramActivity = (typeof PROGRAM_WEEKS)[number][number];

/** Each week needs at least one day. */
export const MIN_PROGRAM_DAYS = PROGRAM_WEEKS.length;

export type ScheduleItem = {
  week: number;
  activity: ProgramActivity;
  startsOn: Date;
  endsOn: Date;
  sortOrder: number;
};

export class ScheduleError extends Error {
  readonly statusCode = 400;
  constructor(
    public readonly code:
      | "INVALID_DATE"
      | "END_BEFORE_START"
      | "TOO_SHORT"
      | "WEEKEND_JURY_DATE"
      | "OUT_OF_RANGE"
  ) {
    super(`Program schedule: ${code}`);
    this.name = "ScheduleError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toCalendarDate(value: Date): Date {
  if (Number.isNaN(value.getTime())) throw new ScheduleError("INVALID_DATE");
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Latest weekday in [floor, from], or null if the range is all weekend. */
function lastWeekday(from: Date, floor: Date): Date | null {
  for (let d = from; d >= floor; d = addDays(d, -1)) {
    if (!isWeekend(d)) return d;
  }
  return null;
}

export function generateProgramSchedule(start: Date, end: Date): ScheduleItem[] {
  const first = toCalendarDate(start);
  const last = toCalendarDate(end);
  if (last < first) throw new ScheduleError("END_BEFORE_START");

  const totalDays = daysBetween(first, last) + 1;
  if (totalDays < MIN_PROGRAM_DAYS) throw new ScheduleError("TOO_SHORT");

  const weeks = PROGRAM_WEEKS.length;
  const items: ScheduleItem[] = [];

  PROGRAM_WEEKS.forEach((activities, i) => {
    const startsOn = addDays(first, Math.floor((i * totalDays) / weeks));
    const endsOn = addDays(first, Math.floor(((i + 1) * totalDays) / weeks) - 1);

    for (const activity of activities) {
      let range = { startsOn, endsOn };
      if (activity === "JURY_PRESENTATION") {
        // One weekday, as late as possible. If the final week is all weekend
        // (only possible in very short programs), fall back to the last
        // weekday before it; six consecutive days always contain one.
        const day = lastWeekday(endsOn, startsOn) ?? lastWeekday(addDays(startsOn, -1), first)!;
        range = { startsOn: day, endsOn: day };
      }
      items.push({ week: i + 1, activity, ...range, sortOrder: items.length });
    }
  });

  return items;
}

/** For university edits: a jury day must be a weekday inside the program. */
export function validateJuryDate(date: Date, programStart: Date, programEnd: Date): Date {
  const day = toCalendarDate(date);
  if (isWeekend(day)) throw new ScheduleError("WEEKEND_JURY_DATE");
  if (day < toCalendarDate(programStart) || day > toCalendarDate(programEnd)) {
    throw new ScheduleError("OUT_OF_RANGE");
  }
  return day;
}
