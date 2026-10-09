import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toFeatureSet, type TenantFeatureSet } from "@/lib/tenant/features";

/**
 * What an organisation has paid for and may use: its modules, its seats, and
 * any programme it bought that the platform team still has to build. The
 * programme builder reads this so the platform team only builds what was sold.
 */
export type TenantEntitlements = {
  id: string;
  name: string;
  features: TenantFeatureSet;
  seatLimit: number;
  seatsUsed: number;
  /** Paid programmes waiting to be completed (PENDING_SETUP). */
  pendingPrograms: { id: string; name: string; participantLimit: number }[];
};

/** Organisations left behind by automated tests; never offered when building real programmes. */
export function isTestTenant(tenant: { name: string; email: string | null }): boolean {
  return /^E2E\b/i.test(tenant.name) || Boolean(tenant.email?.toLowerCase().endsWith(".test"));
}

const select = {
  id: true,
  name: true,
  email: true,
  seatLimit: true,
  seatsUsed: true,
  teachersEnabled: true,
  hackathonEnabled: true,
  simulationsEnabled: true,
  trainingsEnabled: true,
  aiToolsEnabled: true,
  programs: {
    where: { setupStatus: "PENDING_SETUP" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, participantLimit: true },
  },
} as const;

type Row = Prisma.TenantGetPayload<{ select: typeof select }>;

const toEntitlements = (t: Row): TenantEntitlements => ({
  id: t.id,
  name: t.name,
  features: toFeatureSet(t),
  seatLimit: t.seatLimit,
  seatsUsed: t.seatsUsed,
  pendingPrograms: t.programs,
});

/** Active, real organisations a programme can be built for. */
export async function listBuildableTenants(): Promise<TenantEntitlements[]> {
  const rows = await prisma.tenant.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select });
  return rows.filter((t) => !isTestTenant(t)).map(toEntitlements);
}

export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements | null> {
  const row = await prisma.tenant.findUnique({ where: { id: tenantId }, select });
  return row ? toEntitlements(row) : null;
}

export class ModuleNotEnabledError extends Error {
  readonly statusCode = 409;
  readonly code = "MODULE_NOT_ENABLED";
  constructor(readonly modules: string[]) {
    super(`The organisation does not have: ${modules.join(", ")}`);
    this.name = "ModuleNotEnabledError";
  }
}

/**
 * A programme may only use modules its organisation has. Enforced here as
 * well as in the builder, so an old tab or a direct call cannot slip one in.
 */
export async function assertProgramModules(
  db: Prisma.TransactionClient,
  tenantId: string,
  body: { type: string; simulations: string[]; trainings: string[]; aiTools: string[] }
): Promise<void> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { teachersEnabled: true, hackathonEnabled: true, simulationsEnabled: true, trainingsEnabled: true, aiToolsEnabled: true },
  });
  if (!tenant) return;
  const f = toFeatureSet(tenant);
  const missing = [
    body.simulations.length > 0 && !f.simulations && "simulations",
    body.trainings.length > 0 && !f.trainings && "trainings",
    body.aiTools.length > 0 && !f.aiTools && "aiTools",
    body.type === "hackathon" && !f.hackathon && "hackathon",
  ].filter((m): m is string => Boolean(m));
  if (missing.length > 0) throw new ModuleNotEnabledError(missing);
}
