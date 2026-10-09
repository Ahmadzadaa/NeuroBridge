import { prisma } from "@/lib/prisma";

/**
 * The program a student is currently in: their most recent active enrollment.
 * Used by the student-flow screens, which are about a single program.
 */
export async function getCurrentProgramForUser(userId: string) {
  const enrollment = await prisma.participant.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { registrationDate: "desc" },
    select: {
      program: {
        select: {
          id: true,
          name: true,
          description: true,
          programStart: true,
          programEnd: true,
          certificateName: true,
          finalistCount: true,
          juryEnabled: true,
          tenant: { select: { name: true } },
          programTrainings: { select: { trainingType: true } },
          programSimulations: { select: { simulationType: true } },
          _count: { select: { participants: true } },
        },
      },
    },
  });
  return enrollment?.program ?? null;
}

export type CurrentProgram = NonNullable<Awaited<ReturnType<typeof getCurrentProgramForUser>>>;
