import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { localized } from "@/lib/i18n-content";
import {
  TIME_SERIES_WEEKS,
  daysAgo,
  daysBetween,
  resolveRange,
  startOfWeek,
  weekBuckets,
} from "@/lib/analytics/range";
import type {
  AnalyticsOverview,
  AnalyticsQuery,
  CourseBreakdownRow,
  WeeklyPoint,
} from "@/lib/analytics/types";

/**
 * Tenant-level analytics.
 *
 * ## Where tenant isolation comes from
 *
 * `Training`, `Lesson` and `Exam` are platform-level content with no
 * `tenantId` of their own (see `lib/programs/training-access.ts`), and
 * `LessonProgress` / `ExamAttempt` are keyed only by `userId`. So there is no
 * column on the progress tables to filter by. Every read here is therefore
 * anchored through a relation that *does* carry the tenant:
 *
 *   - progress and attempts → `user: { tenantId }`
 *   - enrolments            → `program: { tenantId }`
 *   - logins and certificates → their own `tenantId`
 *
 * `tenantScope()` below is the single place those filters are built, so an
 * added query cannot quietly forget one. `analytics-isolation.test.ts` asserts
 * that a second tenant's rows never appear in any section of the response.
 *
 * ## Why this is not a materialized view
 *
 * Per tenant these tables hold hundreds to low thousands of rows, so the work
 * is a handful of indexed reads assembled in memory. A materialized view would
 * be PostgreSQL-only, while local development runs SQLite — the dashboard
 * would then take a different code path in development than in production,
 * which is exactly the split that already bites this project elsewhere. The
 * result is cached in Redis for an hour instead.
 *
 * Revisit that trade-off if a single tenant passes roughly 100k
 * `LessonProgress` rows: at that point the in-memory assembly stops being
 * cheap and a view (or a nightly rollup table) earns its keep.
 */

interface ProgressRow {
  userId: string;
  lessonId: string;
  completedAt: Date;
}

/** The relation filters that bind every query to one tenant. */
function tenantScope(tenantId: string, programId?: string | null) {
  return {
    /** For rows that hang off a user (progress, attempts). */
    byUser: { user: { tenantId } },
    /** For rows that hang off a programme (participants). */
    byProgram: {
      program: { tenantId, ...(programId ? { id: programId } : {}) },
    },
  };
}

export async function getAnalyticsOverview(
  query: AnalyticsQuery,
  locale = "az",
  now: Date = new Date(),
): Promise<AnalyticsOverview> {
  const { tenantId, courseId, programId } = query;
  const range = resolveRange(query.from, query.to, now);
  const scope = tenantScope(tenantId, programId);

  // 1. Which programmes, and therefore which trainings, belong to this tenant.
  const programs = await prisma.program.findMany({
    where: { tenantId, ...(programId ? { id: programId } : {}) },
    select: { id: true, programTrainings: { select: { trainingType: true } } },
  });

  const keysByProgram = new Map(
    programs.map((p) => [p.id, new Set(p.programTrainings.map((t) => t.trainingType))]),
  );
  const assignedKeys = [...new Set(programs.flatMap((p) => p.programTrainings.map((t) => t.trainingType)))];

  // 2. The trainings themselves. `courseId` narrows to one of them; a course
  //    from outside this tenant's programmes simply matches nothing.
  const trainings = assignedKeys.length
    ? await prisma.training.findMany({
        where: { key: { in: assignedKeys }, ...(courseId ? { id: courseId } : {}) },
        select: {
          id: true,
          key: true,
          titleAz: true,
          titleEn: true,
          titleTr: true,
          lessons: { select: { id: true, estimatedMinutes: true } },
          exams: { select: { id: true } },
        },
      })
    : [];

  const lessonIds = trainings.flatMap((t) => t.lessons.map((l) => l.id));
  const examIds = trainings.flatMap((t) => t.exams.map((e) => e.id));
  const trainingByLesson = new Map<string, string>();
  for (const t of trainings) {
    for (const l of t.lessons) trainingByLesson.set(l.id, t.id);
  }

  const firstWeek = weekBuckets(range.to)[0];

  // 3. Everything else, in parallel. Each filter is tenant-anchored.
  const [
    totalStudents,
    participants,
    certificatesIssued,
    progress,
    attempts,
    logins,
    active7,
    active30,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId, role: "PARTICIPANT" } }),

    prisma.participant.findMany({
      where: scope.byProgram,
      select: { userId: true, programId: true, status: true, registrationDate: true },
    }),

    prisma.certificate.count({
      where: {
        tenantId,
        revokedAt: null,
        issuedAt: { gte: range.from, lte: range.to },
        ...(programId ? { programId } : {}),
      },
    }),

    lessonIds.length
      ? prisma.lessonProgress.findMany({
          where: { lessonId: { in: lessonIds }, ...scope.byUser },
          select: { userId: true, lessonId: true, completedAt: true },
        })
      : Promise.resolve([] as ProgressRow[]),

    examIds.length
      ? prisma.examAttempt.findMany({
          where: { examId: { in: examIds }, ...scope.byUser },
          select: { userId: true, examId: true, score: true },
        })
      : Promise.resolve([] as { userId: string; examId: string; score: number }[]),

    // Logins are the only signal that reflects real activity: Participant
    // .lastLogin is written by the demo seed and by nothing else.
    prisma.auditLog.findMany({
      where: {
        tenantId,
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        createdAt: { gte: firstWeek, lte: range.to },
      },
      select: { userId: true, createdAt: true },
    }),

    distinctActiveUsers(tenantId, daysAgo(7, now), now),
    distinctActiveUsers(tenantId, daysAgo(30, now), now),
  ]);

  // 4. Per-user, per-course rollups.
  const activeUserIdsByKey = new Map<string, Set<string>>();
  for (const p of participants) {
    if (p.status !== "ACTIVE") continue;
    for (const key of keysByProgram.get(p.programId) ?? []) {
      if (!activeUserIdsByKey.has(key)) activeUserIdsByKey.set(key, new Set());
      activeUserIdsByKey.get(key)!.add(p.userId);
    }
  }

  // userId → trainingId → completion timestamps
  const doneByUser = new Map<string, Map<string, Date[]>>();
  for (const row of progress) {
    const trainingId = trainingByLesson.get(row.lessonId);
    if (!trainingId) continue;
    if (!doneByUser.has(row.userId)) doneByUser.set(row.userId, new Map());
    const perTraining = doneByUser.get(row.userId)!;
    if (!perTraining.has(trainingId)) perTraining.set(trainingId, []);
    perTraining.get(trainingId)!.push(row.completedAt);
  }

  const scoresByTraining = new Map<string, number[]>();
  for (const t of trainings) {
    const ids = new Set(t.exams.map((e) => e.id));
    const scores = attempts.filter((a) => ids.has(a.examId)).map((a) => a.score);
    if (scores.length) scoresByTraining.set(t.id, scores);
  }

  const courses: CourseBreakdownRow[] = trainings
    .map((training) => {
      const totalLessons = training.lessons.length;
      const enrolledUsers = activeUserIdsByKey.get(training.key) ?? new Set<string>();

      let completed = 0;
      const spans: number[] = [];
      for (const userId of enrolledUsers) {
        const stamps = doneByUser.get(userId)?.get(training.id) ?? [];
        if (totalLessons > 0 && stamps.length >= totalLessons) {
          completed++;
          const sorted = [...stamps].sort((a, b) => a.getTime() - b.getTime());
          spans.push(daysBetween(sorted[0], sorted[sorted.length - 1]));
        }
      }

      const scores = scoresByTraining.get(training.id) ?? [];

      return {
        courseId: training.id,
        courseKey: training.key,
        title: localized(training, "title", locale),
        enrolled: enrolledUsers.size,
        completed,
        completionPercent: enrolledUsers.size
          ? round1((completed / enrolledUsers.size) * 100)
          : 0,
        averageScore: scores.length ? round1(average(scores)) : null,
        averageActiveDays: spans.length ? round1(average(spans)) : null,
        estimatedMinutes: training.lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled || a.title.localeCompare(b.title));

  // 5. Average completion across every (student, assigned course) pair, so a
  //    course nobody has started still drags the average down — which is the
  //    honest reading of "how far along is this cohort".
  const pairPercents: number[] = [];
  for (const training of trainings) {
    if (training.lessons.length === 0) continue;
    for (const userId of activeUserIdsByKey.get(training.key) ?? []) {
      const done = doneByUser.get(userId)?.get(training.id)?.length ?? 0;
      pairPercents.push(Math.min(100, (done / training.lessons.length) * 100));
    }
  }

  // 6. Weekly series.
  const buckets = weekBuckets(range.to, TIME_SERIES_WEEKS);
  const bucketIndex = new Map(buckets.map((d, i) => [d.getTime(), i]));
  const loginUsersPerWeek = buckets.map(() => new Set<string>());
  const lessonsPerWeek = buckets.map(() => 0);
  const coursesPerWeek = buckets.map(() => 0);

  for (const login of logins) {
    const i = bucketIndex.get(startOfWeek(login.createdAt).getTime());
    if (i !== undefined && login.userId) loginUsersPerWeek[i].add(login.userId);
  }

  for (const row of progress) {
    const i = bucketIndex.get(startOfWeek(row.completedAt).getTime());
    if (i !== undefined) lessonsPerWeek[i]++;
  }

  // A course counts as completed in the week its final lesson was finished.
  for (const [, perTraining] of doneByUser) {
    for (const [trainingId, stamps] of perTraining) {
      const training = trainings.find((t) => t.id === trainingId);
      if (!training || training.lessons.length === 0) continue;
      if (stamps.length < training.lessons.length) continue;
      const last = stamps.reduce((a, b) => (a > b ? a : b));
      const i = bucketIndex.get(startOfWeek(last).getTime());
      if (i !== undefined) coursesPerWeek[i]++;
    }
  }

  const timeSeries: WeeklyPoint[] = buckets.map((weekStart, i) => ({
    weekStart: weekStart.toISOString().slice(0, 10),
    activeStudents: loginUsersPerWeek[i].size,
    lessonsCompleted: lessonsPerWeek[i],
    coursesCompleted: coursesPerWeek[i],
  }));

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      defaulted: range.defaulted,
    },
    filters: { courseId: courseId ?? null, programId: programId ?? null },
    kpis: {
      totalStudents,
      activeStudents7d: active7,
      activeStudents30d: active30,
      enrolments: participants.filter(
        (p) => p.registrationDate >= range.from && p.registrationDate <= range.to,
      ).length,
      averageCompletionPercent: pairPercents.length ? round1(average(pairPercents)) : 0,
      certificatesIssued,
    },
    courses,
    timeSeries,
    meta: {
      generatedAt: now.toISOString(),
      cached: false,
      // Named so the UI can label the column rather than show a plausible
      // number that nothing in the database supports.
      unavailable: ["averageTimeSpent"],
    },
  };
}

/** Distinct users of this tenant with a successful login in the window. */
async function distinctActiveUsers(
  tenantId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const groups = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: {
      tenantId,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      userId: { not: null },
      createdAt: { gte: from, lte: to },
    },
  });
  return groups.length;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
