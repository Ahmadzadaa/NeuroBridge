import { prisma } from "@/lib/prisma";

/**
 * Thrown when a user tries to act on training content that no programme of
 * theirs includes.
 */
export class TrainingNotAssignedError extends Error {
  readonly statusCode = 403;
  readonly code = "TRAINING_NOT_ASSIGNED";

  constructor(message = "This training is not assigned to any of your programmes") {
    super(message);
    this.name = "TrainingNotAssignedError";
  }
}

/**
 * Trainings are platform-level content shared across tenants — they carry no
 * `tenantId` of their own. Access is therefore derived: a user may work on a
 * training only if some programme in their tenant includes it (`ProgramTraining
 * .trainingType` matches `Training.key`) and they are an ACTIVE participant of
 * that programme.
 *
 * Without this check any authenticated participant could submit an attempt for
 * any exam id on the platform — including another tenant's — and collect the
 * completion reward for content they were never assigned.
 */
export async function assertTrainingAccess(params: {
  userId: string;
  tenantId: string | null;
  trainingKey: string;
}): Promise<void> {
  const enrolment = await prisma.participant.findFirst({
    where: {
      userId: params.userId,
      status: "ACTIVE",
      program: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        programTrainings: { some: { trainingType: params.trainingKey } },
      },
    },
    select: { id: true },
  });

  if (!enrolment) {
    throw new TrainingNotAssignedError();
  }
}
