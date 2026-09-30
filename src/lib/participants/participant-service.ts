import { withTenantContext } from "@/lib/db/tenant-context";
import type { TenantContext } from "@/lib/auth/session";
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

export interface ParticipantListItem {
  id: string;
  status: string;
  registrationDate: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    university: string | null;
    faculty: string | null;
    specialty: string | null;
    studyYear: number | null;
  };
}

/** One definition, so the two listings can never drift apart. */
const PARTICIPANT_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  university: true,
  faculty: true,
  specialty: true,
  studyYear: true,
} as const;

export class ProgramNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "PROGRAM_NOT_FOUND";

  constructor() {
    super("Program not found");
    this.name = "ProgramNotFoundError";
  }
}

export async function listProgramParticipants(
  context: TenantContext,
  programId: string,
  tenantId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<ParticipantListItem>> {
  return withTenantContext(context, async (tx) => {
    const program = await tx.program.findFirst({
      where: { id: programId, tenantId },
      select: { id: true },
    });

    if (!program) {
      throw new ProgramNotFoundError();
    }

    const where = { programId };

    const [items, total] = await Promise.all([
      tx.participant.findMany({
        where,
        select: {
          id: true,
          status: true,
          registrationDate: true,
          user: { select: PARTICIPANT_USER_SELECT },
        },
        orderBy: { registrationDate: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      tx.participant.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pagination);
  });
}

export async function listTenantParticipants(
  context: TenantContext,
  tenantId: string,
  pagination: PaginationParams,
  programId?: string
): Promise<PaginatedResult<ParticipantListItem>> {
  return withTenantContext(context, async (tx) => {
    const where = programId
      ? { programId, program: { tenantId } }
      : { program: { tenantId } };

    const [items, total] = await Promise.all([
      tx.participant.findMany({
        where,
        select: {
          id: true,
          status: true,
          registrationDate: true,
          user: { select: PARTICIPANT_USER_SELECT },
        },
        orderBy: { registrationDate: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      tx.participant.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pagination);
  });
}
