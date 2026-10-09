import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { ensureProgramCriteria, criterionLabel } from "@/lib/jury/criteria";
import { computeFinalistResults, validateScores } from "@/lib/jury/scoring";
import { JuryError } from "@/lib/jury/jury-error";

/**
 * The juror's side: the programmes they sit on, each finalist's file and
 * their own scoring sheet. A juror only ever sees programmes they were added
 * to, and only once the organisation has confirmed the finalists.
 */

const OPEN_PROGRAM = { juryEnabled: true, finalistsConfirmedAt: { not: null } } as const;

export async function getJurorWorkload(juryUserId: string) {
  const assignments = await prisma.programJuror.findMany({
    where: { userId: juryUserId, program: OPEN_PROGRAM },
    orderBy: { createdAt: "desc" },
    select: {
      program: {
        select: {
          id: true,
          name: true,
          tenant: { select: { name: true } },
          scheduleItems: { where: { activity: "JURY_PRESENTATION" }, select: { startsOn: true } },
          finalists: {
            orderBy: { platformRank: "asc" },
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true, university: true, avatarPath: true } },
              reviews: { where: { juryUserId }, select: { submittedAt: true } },
              _count: { select: { scores: { where: { juryUserId } } } },
            },
          },
        },
      },
    },
  });

  return assignments.map(({ program }) => ({
    id: program.id,
    name: program.name,
    organisation: program.tenant.name,
    juryDate: program.scheduleItems[0]?.startsOn ?? null,
    finalists: program.finalists.map((f) => ({
      id: f.id,
      userId: f.user.id,
      name: [f.user.firstName, f.user.lastName].filter(Boolean).join(" ") || f.user.email,
      university: f.user.university,
      hasAvatar: Boolean(f.user.avatarPath),
      status: f.reviews[0]?.submittedAt ? ("SUBMITTED" as const) : f._count.scores > 0 ? ("DRAFT" as const) : ("TODO" as const),
    })),
  }));
}

async function assignedFinalist(juryUserId: string, finalistId: string) {
  const finalist = await prisma.programFinalist.findFirst({
    where: { id: finalistId, program: { ...OPEN_PROGRAM, jurors: { some: { userId: juryUserId } } } },
    select: { id: true, programId: true, userId: true, platformScore: true, platformRank: true },
  });
  if (!finalist) throw new JuryError("FINALIST_NOT_FOUND", 404, "Finalist not found");
  return finalist;
}

/** One finalist's file for the scoring screen: who they are, their unit projects, the sheet. */
export async function getFinalistFile(juryUserId: string, finalistId: string, locale: string) {
  const finalist = await assignedFinalist(juryUserId, finalistId);
  const [user, program, criteria, projects, myScores, myReview] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: finalist.userId },
      select: { id: true, firstName: true, lastName: true, email: true, university: true, faculty: true, specialty: true, studyYear: true, avatarPath: true },
    }),
    prisma.program.findUniqueOrThrow({ where: { id: finalist.programId }, select: { id: true, name: true } }),
    ensureProgramCriteria(finalist.programId),
    prisma.lessonProjectSubmission.findMany({
      where: { userId: finalist.userId },
      orderBy: { lesson: { order: "asc" } },
      select: { id: true, content: true, updatedAt: true, lesson: { select: { order: true, titleAz: true, titleEn: true, titleTr: true } } },
    }),
    prisma.finalistScore.findMany({ where: { finalistId, juryUserId }, select: { criterionId: true, score: true } }),
    prisma.finalistReview.findUnique({
      where: { finalistId_juryUserId: { finalistId, juryUserId } },
      select: { comment: true, submittedAt: true },
    }),
  ]);

  return {
    finalist: {
      id: finalist.id,
      platformScore: finalist.platformScore,
      platformRank: finalist.platformRank,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      userId: user.id,
      hasAvatar: Boolean(user.avatarPath),
      university: user.university,
      faculty: user.faculty,
      specialty: user.specialty,
      studyYear: user.studyYear,
    },
    program,
    criteria: criteria.map((c) => ({ id: c.id, label: criterionLabel(c, locale), maxScore: c.maxScore, weight: c.weight })),
    projects: projects.map((p) => ({
      id: p.id,
      order: p.lesson.order,
      title: localized(p.lesson, "title", locale),
      content: p.content,
      updatedAt: p.updatedAt,
    })),
    scores: Object.fromEntries(myScores.map((s) => [s.criterionId, s.score])),
    comment: myReview?.comment ?? "",
    submittedAt: myReview?.submittedAt ?? null,
  };
}

/**
 * Saves the juror's sheet. A draft may be partial; submitting needs every
 * criterion. A submitted sheet can still be corrected — it stays submitted.
 */
export async function saveEvaluation(
  juryUserId: string,
  finalistId: string,
  input: { scores: Record<string, number>; comment?: string; submit: boolean }
) {
  const finalist = await assignedFinalist(juryUserId, finalistId);
  const criteria = await ensureProgramCriteria(finalist.programId);
  const check = validateScores(criteria, input.scores, input.submit);
  if (!check.ok) {
    throw new JuryError(check.reason, 400, check.reason === "INVALID_SCORE" ? "Invalid score" : "Every criterion needs a score");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const [criterionId, score] of Object.entries(input.scores)) {
      await tx.finalistScore.upsert({
        where: { finalistId_criterionId_juryUserId: { finalistId, criterionId, juryUserId } },
        create: { finalistId, criterionId, juryUserId, score },
        update: { score },
      });
    }
    const existing = await tx.finalistReview.findUnique({
      where: { finalistId_juryUserId: { finalistId, juryUserId } },
      select: { submittedAt: true },
    });
    await tx.finalistReview.upsert({
      where: { finalistId_juryUserId: { finalistId, juryUserId } },
      create: { finalistId, juryUserId, comment: input.comment || null, submittedAt: input.submit ? now : null },
      update: { comment: input.comment || null, submittedAt: existing?.submittedAt ?? (input.submit ? now : null) },
    });
  });
  return { submitted: input.submit };
}

/**
 * Live finalist ranking for each programme the juror sits on. Only submitted
 * evaluations count, so a half-filled draft never moves anyone up or down;
 * totals are the weighted, scale-normalised averages the organisation sees.
 */
export async function getJurorRankings(juryUserId: string) {
  const assignments = await prisma.programJuror.findMany({
    where: { userId: juryUserId, program: OPEN_PROGRAM },
    orderBy: { createdAt: "desc" },
    select: {
      program: {
        select: {
          id: true,
          name: true,
          tenant: { select: { name: true } },
          jurors: { select: { userId: true } },
          finalists: {
            orderBy: { platformRank: "asc" },
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true, avatarPath: true } },
              scores: { select: { criterionId: true, juryUserId: true, score: true } },
              reviews: { where: { submittedAt: { not: null } }, select: { juryUserId: true } },
            },
          },
        },
      },
    },
  });
  const programIds = assignments.map((a) => a.program.id);
  const criteria = programIds.length
    ? await prisma.juryCriterion.findMany({ where: { programId: { in: programIds } }, select: { id: true, programId: true, maxScore: true, weight: true } })
    : [];

  return assignments.map(({ program }) => {
    const jurorIds = program.jurors.map((j) => j.userId);
    const scores = program.finalists.flatMap((f) => {
      const submitted = new Set(f.reviews.map((r) => r.juryUserId));
      return f.scores.filter((s) => submitted.has(s.juryUserId)).map((s) => ({ ...s, finalistId: f.id }));
    });
    const results = computeFinalistResults({
      criteria: criteria.filter((c) => c.programId === program.id),
      finalistIds: program.finalists.map((f) => f.id),
      jurorIds,
      scores,
    });
    const rows = results.map((r) => {
      const f = program.finalists.find((x) => x.id === r.finalistId)!;
      return {
        finalistId: f.id,
        userId: f.user.id,
        name: [f.user.firstName, f.user.lastName].filter(Boolean).join(" ") || f.user.email,
        hasAvatar: Boolean(f.user.avatarPath),
        total: r.total,
        rank: r.rank,
        jurorsScored: r.jurorsScored,
      };
    });
    // Scored finalists by rank, then the rest in their platform order.
    rows.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    return { id: program.id, name: program.name, organisation: program.tenant.name, jurors: jurorIds.length, rows };
  });
}
