import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { localized } from "@/lib/i18n-content";
import { localized as localizedJson } from "@/lib/assessments/scoring";
import { computeFinalistResults } from "@/lib/jury/scoring";
import { computeRankings } from "@/lib/hackathon/ranking";
import { academicYearOf } from "@/lib/reports/university-types";
import { programTrainingKeys } from "@/lib/programs/training-access";
import type { DimensionScores } from "@/lib/assessments/scoring";

/**
 * Everything the eight reports read, loaded once per request. Every query is
 * anchored to the tenant through the programme (enrolments, teams, results,
 * certificates) or through the student's enrolment (progress, attempts, runs),
 * because the platform-wide training tables carry no tenant of their own.
 */

export interface DsProgram {
  id: string;
  name: string;
  type: string;
  academicYear: number;
  trainingKeys: string[];
}

export interface DsUser {
  id: string;
  name: string;
  email: string;
  university: string | null;
  department: string | null;
  studyYear: number | null;
  coins: number;
  /** Logged in within the last 30 days. */
  recentlyActive: boolean;
  opportunities: boolean;
  psychShared: boolean;
}

export interface DsTraining {
  id: string;
  key: string;
  title: string;
  lessons: { id: string; title: string; isUnit: boolean; points: number }[];
  exams: { id: string; lessonId: string | null }[];
}

export interface ReportDataset {
  programs: DsProgram[];
  participants: { userId: string; programId: string; status: string; registeredAt: Date }[];
  users: Map<string, DsUser>;
  trainings: DsTraining[];
  progress: { userId: string; lessonId: string }[];
  attempts: { userId: string; examId: string; score: number; passed: boolean }[];
  ideas: { userId: string; lessonId: string }[];
  simulations: { id: string; title: string }[];
  runs: { userId: string; simulationId: string; completed: boolean; score: number | null }[];
  certificates: { userId: string; programId: string | null }[];
  assessments: { id: string; kind: string; title: string; dimensions: { code: string; label: string }[] }[];
  results: { userId: string; programId: string; assessmentId: string; scores: DimensionScores }[];
  teams: {
    programId: string;
    name: string;
    members: number;
    submitted: boolean;
    total: number | null;
    rank: number;
  }[];
  finalists: { programId: string; userId: string; platformRank: number; juryTotal: number | null; jurorsScored: number; juryRank: number | null }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadReportDataset(
  tenantId: string,
  locale: string,
  programId: string | null,
  now = new Date()
): Promise<ReportDataset> {
  const programWhere = { tenantId, ...(programId ? { id: programId } : {}) };
  const enrolled = { participants: { some: { program: programWhere } } };

  const programs = await prisma.program.findMany({
    where: programWhere,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      programStart: true,
      applicationStart: true,
      juryEnabled: true,
      programTrainings: { select: { trainingType: true } },
      programSimulations: { select: { simulationType: true } },
    },
  });
  const programIds = programs.map((p) => p.id);
  const keysByProgram = new Map(programs.map((p) => [p.id, programTrainingKeys(p)]));
  const trainingKeys = [...new Set([...keysByProgram.values()].flat())];

  const [participants, users, logins, trainings, simulations, certificates, assessments, results, finalistRows] =
    await Promise.all([
      prisma.participant.findMany({
        where: { programId: { in: programIds } },
        select: { userId: true, programId: true, status: true, registrationDate: true },
      }),
      prisma.user.findMany({
        where: { tenantId, ...enrolled },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          university: true,
          faculty: true,
          specialty: true,
          studyYear: true,
          coinBalance: true,
          universityRef: { select: { name: true } },
          departmentRef: { select: { name: true } },
          consents: {
            where: { type: { in: ["OPPORTUNITIES", "PSYCH_RESULTS_SHARE"] } },
            orderBy: { createdAt: "desc" },
            select: { type: true, granted: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { tenantId, action: AUDIT_ACTIONS.LOGIN_SUCCESS, createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      trainingKeys.length
        ? prisma.training.findMany({
            where: { key: { in: trainingKeys } },
            select: {
              id: true,
              key: true,
              titleAz: true,
              titleEn: true,
              titleTr: true,
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, titleAz: true, titleEn: true, titleTr: true, activity: true, points: true },
              },
              exams: { select: { id: true, lessonId: true } },
            },
          })
        : [],
      prisma.simulation.findMany({
        where: { runs: { some: { user: { tenantId, ...enrolled } } } },
        select: { id: true, nameAz: true, nameEn: true, nameTr: true },
      }),
      prisma.certificate.findMany({
        where: { tenantId, revokedAt: null, user: enrolled },
        select: { userId: true, programId: true },
      }),
      prisma.assessment.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, kind: true, title: true, dimensions: { orderBy: { sortOrder: "asc" }, select: { code: true, label: true } } },
      }),
      prisma.assessmentResult.findMany({
        where: { programId: { in: programIds } },
        select: { userId: true, programId: true, assessmentId: true, scores: true },
      }),
      prisma.programFinalist.findMany({
        where: { programId: { in: programIds }, program: { juryEnabled: true, finalistsConfirmedAt: { not: null } } },
        orderBy: { platformRank: "asc" },
        select: { id: true, programId: true, userId: true, platformRank: true },
      }),
    ]);

  const lessonIds = trainings.flatMap((t) => t.lessons.map((l) => l.id));
  const examIds = trainings.flatMap((t) => t.exams.map((e) => e.id));
  const byUser = { user: { tenantId, ...enrolled } };

  const [progress, attempts, ideas, runs, teams, finalists] = await Promise.all([
    lessonIds.length
      ? prisma.lessonProgress.findMany({ where: { lessonId: { in: lessonIds }, ...byUser }, select: { userId: true, lessonId: true } })
      : [],
    examIds.length
      ? prisma.examAttempt.findMany({
          where: { examId: { in: examIds }, ...byUser },
          select: { userId: true, examId: true, score: true, passed: true },
        })
      : [],
    lessonIds.length
      ? prisma.lessonProjectSubmission.findMany({ where: { lessonId: { in: lessonIds }, ...byUser }, select: { userId: true, lessonId: true } })
      : [],
    prisma.simulationRun.findMany({ where: byUser, select: { userId: true, simulationId: true, status: true, score: true } }),
    loadTeams(programs.filter((p) => p.type === "hackathon").map((p) => p.id)),
    loadFinalistResults(finalistRows),
  ]);

  const loggedIn = new Set(logins.map((l) => l.userId));

  return {
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      academicYear: academicYearOf(p.programStart ?? p.applicationStart),
      trainingKeys: keysByProgram.get(p.id) ?? [],
    })),
    participants: participants.map((p) => ({ userId: p.userId, programId: p.programId, status: p.status, registeredAt: p.registrationDate })),
    users: new Map(
      users.map((u) => {
        const consent = (type: string) => u.consents.find((c) => c.type === type)?.granted === true;
        return [
          u.id,
          {
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
            email: u.email,
            university: u.universityRef?.name ?? u.university,
            department: u.departmentRef?.name ?? u.specialty ?? u.faculty,
            studyYear: u.studyYear,
            coins: u.coinBalance,
            recentlyActive: loggedIn.has(u.id),
            opportunities: consent("OPPORTUNITIES"),
            psychShared: consent("PSYCH_RESULTS_SHARE"),
          },
        ];
      })
    ),
    trainings: trainings.map((t) => ({
      id: t.id,
      key: t.key,
      title: localized(t, "title", locale),
      lessons: t.lessons.map((l) => ({ id: l.id, title: localized(l, "title", locale), isUnit: Boolean(l.activity), points: l.points })),
      exams: t.exams,
    })),
    progress,
    attempts,
    ideas,
    simulations: simulations.map((s) => ({ id: s.id, title: localized(s, "name", locale) })),
    runs: runs.map((r) => ({ userId: r.userId, simulationId: r.simulationId, completed: r.status === "COMPLETED", score: r.score })),
    certificates,
    assessments: assessments.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: localizedJson(a.title, locale),
      dimensions: a.dimensions.map((d) => ({ code: d.code, label: localizedJson(d.label, locale) })),
    })),
    results: results.map((r) => ({ ...r, scores: JSON.parse(r.scores) as DimensionScores })),
    teams,
    finalists,
  };
}

async function loadTeams(hackathonIds: string[]): Promise<ReportDataset["teams"]> {
  const perProgram = await Promise.all(
    hackathonIds.map(async (programId) =>
      (await computeRankings(programId)).map((team) => ({
        programId,
        name: team.teamName,
        members: team.memberCount,
        submitted: team.submissionId !== null,
        total: team.total,
        rank: team.rank,
      }))
    )
  );
  return perProgram.flat();
}

async function loadFinalistResults(
  finalists: { id: string; programId: string; userId: string; platformRank: number }[]
): Promise<ReportDataset["finalists"]> {
  const programIds = [...new Set(finalists.map((f) => f.programId))];
  if (programIds.length === 0) return [];
  const [criteria, jurors, scores] = await Promise.all([
    prisma.juryCriterion.findMany({ where: { programId: { in: programIds } }, select: { id: true, programId: true, maxScore: true, weight: true } }),
    prisma.programJuror.findMany({ where: { programId: { in: programIds } }, select: { programId: true, userId: true } }),
    prisma.finalistScore.findMany({
      where: { finalistId: { in: finalists.map((f) => f.id) } },
      select: { finalistId: true, criterionId: true, juryUserId: true, score: true },
    }),
  ]);

  return programIds.flatMap((programId) => {
    const mine = finalists.filter((f) => f.programId === programId);
    const results = computeFinalistResults({
      criteria: criteria.filter((c) => c.programId === programId),
      finalistIds: mine.map((f) => f.id),
      jurorIds: jurors.filter((j) => j.programId === programId).map((j) => j.userId),
      scores,
    });
    return mine.map((f) => {
      const r = results.find((x) => x.finalistId === f.id);
      return {
        programId,
        userId: f.userId,
        platformRank: f.platformRank,
        juryTotal: r?.total ?? null,
        jurorsScored: r?.jurorsScored ?? 0,
        juryRank: r?.rank ?? null,
      };
    });
  });
}
