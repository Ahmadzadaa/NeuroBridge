import { prisma } from "@/lib/prisma";
import { IDEA_DEV_TRAINING_KEY } from "@/lib/training/units-service";
import { unusablePasswordHash } from "@/lib/onboarding/activation-token";
import { sendMemberInvitation } from "@/lib/onboarding/member-invitation";
import { ensureProgramCriteria } from "@/lib/jury/criteria";
import { computeFinalistResults, rankByPlatformScore } from "@/lib/jury/scoring";
import { JuryError } from "@/lib/jury/jury-error";

/**
 * The organisation's side of a programme's jury round: switching it on,
 * choosing finalists from the platform evaluation, inviting jurors and
 * reading the averaged results. Every call is scoped to the caller's tenant.
 */

export const MAX_FINALISTS = 100;

async function ownedProgram(tenantId: string, programId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, tenantId },
    select: { id: true, name: true, juryEnabled: true, finalistCount: true, finalistsConfirmedAt: true },
  });
  if (!program) throw new JuryError("PROGRAM_NOT_FOUND", 404, "Program not found");
  return program;
}

export async function updateJurySettings(
  tenantId: string,
  programId: string,
  settings: { juryEnabled?: boolean; finalistCount?: number | null }
) {
  await ownedProgram(tenantId, programId);
  const program = await prisma.program.update({
    where: { id: programId },
    data: settings,
    select: { juryEnabled: true, finalistCount: true },
  });
  if (program.juryEnabled) await ensureProgramCriteria(programId);
  return program;
}

/**
 * The platform evaluation: every active student ranked by unit points (tests
 * passed), ties broken by their total test score.
 */
export async function platformRanking(programId: string) {
  const participants = await prisma.participant.findMany({
    where: { programId, status: "ACTIVE" },
    select: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, university: true, faculty: true, avatarPath: true },
      },
    },
  });
  const userIds = participants.map((p) => p.user.id);
  const lessons = userIds.length
    ? await prisma.lesson.findMany({
        where: { training: { key: IDEA_DEV_TRAINING_KEY }, activity: { not: null } },
        select: {
          points: true,
          unitExams: { select: { attempts: { where: { userId: { in: userIds } }, select: { userId: true, score: true, passed: true } } } },
        },
      })
    : [];

  const totals = new Map(userIds.map((id) => [id, { points: 0, testTotal: 0 }]));
  for (const lesson of lessons) {
    // Best attempt per student per unit; points count once, on a pass.
    const best = new Map<string, { score: number; passed: boolean }>();
    for (const a of lesson.unitExams.flatMap((e) => e.attempts)) {
      const prev = best.get(a.userId);
      if (!prev || a.score > prev.score) best.set(a.userId, { score: a.score, passed: prev?.passed || a.passed });
      else if (a.passed) prev.passed = true;
    }
    for (const [userId, b] of best) {
      const t = totals.get(userId)!;
      t.testTotal += b.score;
      if (b.passed) t.points += lesson.points;
    }
  }

  return rankByPlatformScore(
    participants.map(({ user }) => ({
      userId: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      email: user.email,
      university: user.university,
      faculty: user.faculty,
      hasAvatar: Boolean(user.avatarPath),
      ...totals.get(user.id)!,
    }))
  );
}

/**
 * Replaces the finalist list and opens it to the jury. A finalist who already
 * has scores cannot be dropped: that would throw away the jurors' work.
 */
export async function confirmFinalists(tenantId: string, programId: string, userIds: string[]) {
  const program = await ownedProgram(tenantId, programId);
  if (!program.juryEnabled) throw new JuryError("JURY_DISABLED", 409, "Jury round is not enabled");
  const unique = [...new Set(userIds)];
  if (unique.length > MAX_FINALISTS) throw new JuryError("TOO_MANY_FINALISTS", 400, "Too many finalists");

  const ranking = await platformRanking(programId);
  const byUser = new Map(ranking.map((r) => [r.userId, r]));
  if (unique.some((id) => !byUser.has(id))) throw new JuryError("NOT_A_PARTICIPANT", 400, "Not an active participant");

  return prisma.$transaction(async (tx) => {
    const current = await tx.programFinalist.findMany({
      where: { programId },
      select: { id: true, userId: true, _count: { select: { scores: true } } },
    });
    const dropped = current.filter((f) => !unique.includes(f.userId));
    if (dropped.some((f) => f._count.scores > 0)) {
      throw new JuryError("FINALIST_SCORED", 409, "A scored finalist cannot be removed");
    }
    await tx.programFinalist.deleteMany({ where: { id: { in: dropped.map((f) => f.id) } } });
    const kept = new Set(current.map((f) => f.userId));
    await tx.programFinalist.createMany({
      data: unique
        .filter((id) => !kept.has(id))
        .map((id) => ({ programId, userId: id, platformScore: byUser.get(id)!.points, platformRank: byUser.get(id)!.rank })),
    });
    await tx.program.update({ where: { id: programId }, data: { finalistsConfirmedAt: new Date() } });
    return unique.length;
  });
}

/**
 * Adds a juror to the programme. A new address gets a JURY account and a
 * set-password link; an existing juror of the organisation is just attached.
 * Accounts with another role are refused rather than silently converted.
 */
export async function addProgramJuror(params: {
  tenantId: string;
  programId: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
}) {
  await ownedProgram(params.tenantId, params.programId);
  const email = params.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: params.tenantId, email } },
    select: { id: true, role: true },
  });
  if (existing && existing.role !== "JURY") throw new JuryError("USER_HAS_OTHER_ROLE", 409, "User has another role");

  const userId =
    existing?.id ??
    (
      await prisma.user.create({
        data: {
          tenantId: params.tenantId,
          email,
          firstName: params.firstName,
          lastName: params.lastName,
          role: "JURY",
          language: params.language,
          passwordHash: await unusablePasswordHash(),
        },
        select: { id: true },
      })
    ).id;

  const already = await prisma.programJuror.findUnique({
    where: { programId_userId: { programId: params.programId, userId } },
  });
  if (already) throw new JuryError("ALREADY_JUROR", 409, "Already on this jury");
  await prisma.programJuror.create({ data: { programId: params.programId, userId } });

  const emailed = existing
    ? false
    : await sendMemberInvitation({ userId, email, role: "JURY", tenantId: params.tenantId, language: params.language });
  return { userId, created: !existing, emailed };
}

export async function removeProgramJuror(tenantId: string, programId: string, userId: string) {
  await ownedProgram(tenantId, programId);
  const deleted = await prisma.programJuror.deleteMany({ where: { programId, userId } });
  if (deleted.count === 0) throw new JuryError("JUROR_NOT_FOUND", 404, "Juror not found");
}

/** Sends a juror a fresh set-password link (they lost it, or it expired). */
export async function resendJurorInvitation(tenantId: string, programId: string, userId: string, language: string) {
  await ownedProgram(tenantId, programId);
  const juror = await prisma.programJuror.findUnique({
    where: { programId_userId: { programId, userId } },
    select: { user: { select: { email: true } } },
  });
  if (!juror) throw new JuryError("JUROR_NOT_FOUND", 404, "Juror not found");
  return sendMemberInvitation({ userId, email: juror.user.email, role: "JURY", tenantId, language });
}

/** Everything the organisation's jury page shows, in one load. */
export async function getProgramJuryOverview(tenantId: string, programId: string) {
  const program = await ownedProgram(tenantId, programId);
  const [criteria, jurors, finalists, ranking] = await Promise.all([
    program.juryEnabled ? ensureProgramCriteria(programId) : prisma.juryCriterion.findMany({ where: { programId }, orderBy: { order: "asc" } }),
    prisma.programJuror.findMany({
      where: { programId },
      orderBy: { createdAt: "asc" },
      select: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, headline: true, bio: true, avatarPath: true } },
      },
    }),
    prisma.programFinalist.findMany({
      where: { programId },
      orderBy: { platformRank: "asc" },
      select: {
        id: true,
        userId: true,
        platformScore: true,
        platformRank: true,
        user: { select: { firstName: true, lastName: true, email: true, university: true, avatarPath: true } },
        scores: { select: { criterionId: true, juryUserId: true, score: true } },
        reviews: { where: { submittedAt: { not: null } }, select: { juryUserId: true } },
      },
    }),
    platformRanking(programId),
  ]);

  const jurorIds = jurors.map((j) => j.user.id);
  const results = computeFinalistResults({
    criteria,
    finalistIds: finalists.map((f) => f.id),
    jurorIds,
    scores: finalists.flatMap((f) => f.scores.map((s) => ({ ...s, finalistId: f.id }))),
  });
  const submittedBy = new Map(finalists.map((f) => [f.id, f.reviews.filter((r) => jurorIds.includes(r.juryUserId)).length]));

  return { program, criteria, jurors: jurors.map((j) => j.user), finalists, ranking, results, submittedBy };
}
