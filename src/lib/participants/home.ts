import { prisma } from "@/lib/prisma";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import { getProgramSchedule, type StoredScheduleItem } from "@/lib/programs/schedule-service";
import { PROGRAM_WEEKS } from "@/lib/programs/schedule";

const DAY = 86_400_000;

/** UTC midnight of `now`, matching how schedule dates are stored. */
function today(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Where the student stands in their programme's calendar. */
export function programTimeline(schedule: StoredScheduleItem[], start: Date | null, end: Date | null, now = new Date()) {
  const day = today(now);
  const current = schedule.find((i) => i.startsOn <= day && day <= i.endsOn) ?? null;
  const upcoming = schedule.filter((i) => i.endsOn >= day).slice(0, 4);
  if (!start || !end) return { phase: "undated" as const, percent: 0, week: null, daysLeft: null, current, upcoming };
  if (day < start) {
    return { phase: "upcoming" as const, percent: 0, week: null, daysLeft: Math.round((start.getTime() - day.getTime()) / DAY), current, upcoming };
  }
  if (day > end) return { phase: "finished" as const, percent: 100, week: PROGRAM_WEEKS.length, daysLeft: 0, current, upcoming };
  const span = Math.max(end.getTime() - start.getTime(), DAY);
  return {
    phase: "running" as const,
    percent: Math.round(((day.getTime() - start.getTime()) / span) * 100),
    week: current?.week ?? null,
    daysLeft: Math.round((end.getTime() - day.getTime()) / DAY),
    current,
    upcoming,
  };
}

/** Everything the student home screen shows, in one round of queries. */
export async function getParticipantHome(userId: string) {
  const program = await getCurrentProgramForUser(userId);
  const trainingKeys = program?.programTrainings.map((p) => p.trainingType) ?? [];

  const [user, schedule, lessons, completedSimulations, finalist] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { coinBalance: true, _count: { select: { userBadges: true, certificates: true } } },
    }),
    program ? getProgramSchedule(program.id) : Promise.resolve([]),
    trainingKeys.length
      ? prisma.lesson.findMany({
          where: { training: { key: { in: trainingKeys } } },
          select: { id: true, progress: { where: { userId }, select: { id: true }, take: 1 } },
        })
      : Promise.resolve([]),
    prisma.simulationRun.count({ where: { userId, status: "COMPLETED" } }),
    // Shown only once the organisation has confirmed the list and the jury round is on.
    program
      ? prisma.programFinalist.findFirst({
          where: { userId, programId: program.id, program: { juryEnabled: true, finalistsConfirmedAt: { not: null } } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    program,
    timeline: program ? programTimeline(schedule, program.programStart, program.programEnd) : null,
    lessons: { total: lessons.length, done: lessons.filter((l) => l.progress.length > 0).length },
    coins: user?.coinBalance ?? 0,
    badges: user?._count.userBadges ?? 0,
    certificates: user?._count.certificates ?? 0,
    completedSimulations,
    isFinalist: Boolean(finalist),
    juryDay: schedule.find((i) => i.activity === "JURY_PRESENTATION")?.startsOn ?? null,
  };
}
