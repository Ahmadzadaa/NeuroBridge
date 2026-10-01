import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Which simulations a participant may open. Platform simulations are content
 * the organisation buys per programme, so they must be part of one of the
 * participant's active programmes; a tenant's own (teacher-authored) scenarios
 * are open to that tenant's active participants. Another tenant's scenarios
 * are never visible.
 */
export async function canAccessSimulation(
  db: Db,
  params: { userId: string; tenantId: string | null; simulation: { key: string; tenantId: string | null } }
): Promise<boolean> {
  const { userId, tenantId, simulation } = params;
  if (!tenantId) return false;
  if (simulation.tenantId !== null && simulation.tenantId !== tenantId) return false;
  const enrolment = await db.participant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      program: {
        tenantId,
        ...(simulation.tenantId === null ? { programSimulations: { some: { simulationType: simulation.key } } } : {}),
      },
    },
    select: { id: true },
  });
  return enrolment !== null;
}

/** The same rule as a query filter, for listing the simulations a participant can open. */
export async function accessibleSimulationsWhere(db: Db, userId: string, tenantId: string | null): Promise<Prisma.SimulationWhereInput> {
  if (!tenantId) return { id: { in: [] } };
  const programs = await db.program.findMany({
    where: { tenantId, participants: { some: { userId, status: "ACTIVE" } } },
    select: { programSimulations: { select: { simulationType: true } } },
  });
  if (programs.length === 0) return { id: { in: [] } };
  const keys = [...new Set(programs.flatMap((p) => p.programSimulations.map((s) => s.simulationType)))];
  return { OR: [{ tenantId: null, key: { in: keys } }, { tenantId }] };
}
