import { prisma } from "@/lib/prisma";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import {
  bandOf,
  developmentAreas,
  localized,
  scoreAssessment,
  type Band,
  type DimensionScores,
} from "@/lib/assessments/scoring";

export class AssessmentError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "NO_PROGRAM" | "ALREADY_COMPLETED",
    public readonly statusCode: number
  ) {
    super(`Assessment: ${code}`);
    this.name = "AssessmentError";
  }
}

const activeAssessments = () =>
  prisma.assessment.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

/** The student's baseline tests for their current program, with completion. */
export async function listStudentAssessments(userId: string, locale: string) {
  const program = await getCurrentProgramForUser(userId);
  if (!program) return null;
  const [assessments, results] = await Promise.all([
    activeAssessments(),
    prisma.assessmentResult.findMany({
      where: { userId, programId: program.id },
      select: { assessmentId: true, completedAt: true },
    }),
  ]);
  const done = new Map(results.map((r) => [r.assessmentId, r.completedAt]));
  return {
    programId: program.id,
    assessments: assessments.map((a) => ({
      code: a.code,
      kind: a.kind,
      isDemo: a.isDemo,
      title: localized(a.title, locale),
      description: localized(a.description, locale),
      completedAt: done.get(a.id) ?? null,
    })),
  };
}

export async function getAssessmentForm(code: string, locale: string) {
  const a = await prisma.assessment.findFirst({
    where: { code, active: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!a) throw new AssessmentError("NOT_FOUND", 404);
  return {
    code: a.code,
    kind: a.kind,
    isDemo: a.isDemo,
    title: localized(a.title, locale),
    description: localized(a.description, locale),
    scaleMin: a.scaleMin,
    scaleMax: a.scaleMax,
    questions: a.questions.map((q) => ({ id: q.id, text: localized(q.text, locale) })),
  };
}

/**
 * Scores and stores one test. When it completes the baseline analysis (all
 * active tests done), the university gets a panel notification in the same
 * transaction.
 */
export async function submitAssessment(userId: string, code: string, answers: Record<string, number>) {
  const program = await getCurrentProgramForUser(userId);
  if (!program) throw new AssessmentError("NO_PROGRAM", 409);
  const assessment = await prisma.assessment.findFirst({
    where: { code, active: true },
    include: { questions: { select: { id: true, dimensionCode: true, reverse: true } } },
  });
  if (!assessment) throw new AssessmentError("NOT_FOUND", 404);

  const scores = scoreAssessment(assessment, assessment.questions, answers);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.assessmentResult.findUnique({
      where: { userId_programId_assessmentId: { userId, programId: program.id, assessmentId: assessment.id } },
      select: { id: true },
    });
    if (existing) throw new AssessmentError("ALREADY_COMPLETED", 409);

    await tx.assessmentResult.create({
      data: {
        userId,
        programId: program.id,
        assessmentId: assessment.id,
        assessmentVersion: assessment.version,
        answers: JSON.stringify(answers),
        scores: JSON.stringify(scores),
      },
    });

    const [activeCount, doneCount] = await Promise.all([
      tx.assessment.count({ where: { active: true } }),
      tx.assessmentResult.count({ where: { userId, programId: program.id, assessment: { active: true } } }),
    ]);
    const analysisComplete = doneCount >= activeCount;
    if (analysisComplete) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
      if (user?.tenantId) {
        await tx.tenantNotification.create({
          data: {
            tenantId: user.tenantId,
            type: "ASSESSMENTS_COMPLETED",
            payload: JSON.stringify({ userId, programId: program.id }),
          },
        });
      }
    }
    return { scores, analysisComplete };
  });
}

export type DimensionResult = { code: string; label: string; score: number; band: Band; feedback: string };

/** Everything the student results screen shows, localized. */
export async function getStudentResults(userId: string, locale: string) {
  const program = await getCurrentProgramForUser(userId);
  if (!program) return null;
  const results = await prisma.assessmentResult.findMany({
    where: { userId, programId: program.id },
    include: { assessment: { include: { dimensions: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { assessment: { sortOrder: "asc" } },
  });

  const assessments = results.map((r) => {
    const scores = JSON.parse(r.scores) as DimensionScores;
    const dimensions: DimensionResult[] = r.assessment.dimensions
      .filter((d) => d.code in scores)
      .map((d) => {
        const score = scores[d.code];
        const band = bandOf(score);
        const text = band === "low" ? d.lowText : band === "mid" ? d.midText : d.highText;
        return { code: d.code, label: localized(d.label, locale), score, band, feedback: localized(text, locale) };
      });
    return {
      code: r.assessment.code,
      kind: r.assessment.kind,
      isDemo: r.assessment.isDemo,
      title: localized(r.assessment.title, locale),
      completedAt: r.completedAt,
      dimensions,
    };
  });

  const all = assessments.flatMap((a) => a.dimensions);
  return {
    assessments,
    developmentAreas: developmentAreas(all),
    strengths: [...all].sort((a, b) => b.score - a.score).slice(0, 2),
  };
}

/**
 * The university's view of its students' baseline analysis. PSYCH scores are
 * included only for students whose latest PSYCH_RESULTS_SHARE consent is a
 * yes; for everyone else the university sees completion only.
 */
export async function getTenantAssessmentOverview(tenantId: string, locale: string) {
  const [assessments, participants] = await Promise.all([
    prisma.assessment.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { dimensions: { orderBy: { sortOrder: "asc" }, select: { code: true, label: true } } },
    }),
    prisma.participant.findMany({
      where: { program: { tenantId }, status: "ACTIVE" },
      orderBy: { registrationDate: "desc" },
      take: 500,
      select: {
        programId: true,
        program: { select: { name: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            assessmentResults: { select: { programId: true, assessmentId: true, scores: true, completedAt: true } },
            consents: {
              where: { type: "PSYCH_RESULTS_SHARE" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { granted: true },
            },
          },
        },
      },
    }),
  ]);

  const rows = participants.map((p) => {
    const psychShared = p.user.consents[0]?.granted === true;
    return {
      userId: p.user.id,
      name: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email,
      email: p.user.email,
      programName: p.program.name,
      psychShared,
      results: assessments.map((a) => {
        const r = p.user.assessmentResults.find((x) => x.assessmentId === a.id && x.programId === p.programId);
        const visible = r && (a.kind !== "PSYCH" || psychShared);
        return {
          code: a.code,
          completedAt: r?.completedAt ?? null,
          scores: visible ? (JSON.parse(r.scores) as DimensionScores) : null,
        };
      }),
    };
  });

  return {
    assessments: assessments.map((a) => ({
      code: a.code,
      kind: a.kind,
      title: localized(a.title, locale),
      dimensionLabels: Object.fromEntries(a.dimensions.map((d) => [d.code, localized(d.label, locale)])),
    })),
    rows,
  };
}
