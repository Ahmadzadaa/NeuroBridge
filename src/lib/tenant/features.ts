import { prisma } from "@/lib/prisma";

/**
 * Per-tenant module entitlements.
 *
 * `tenantType` is a preset that seeds the flags when an organisation is
 * created — it is not a lock. Every flag stays independently editable
 * afterwards, so a university that wants to run a hackathon simply has that
 * flag switched on rather than being moved to another type.
 */

export const TENANT_TYPES = ["UNIVERSITY", "TECHNOPARK", "FULL"] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const TENANT_FEATURES = [
  "teachers",
  "hackathon",
  "simulations",
  "trainings",
  "aiTools",
] as const;
export type TenantFeature = (typeof TENANT_FEATURES)[number];

export type TenantFeatureSet = Record<TenantFeature, boolean>;

/**
 * Starting points, not rules.
 *
 * A university teaches through the teacher panel; a technopark runs
 * hackathons and has no teachers. `FULL` is for organisations doing both.
 */
export const TENANT_TYPE_PRESETS: Record<TenantType, TenantFeatureSet> = {
  UNIVERSITY: {
    teachers: true,
    hackathon: false,
    simulations: true,
    trainings: true,
    aiTools: true,
  },
  TECHNOPARK: {
    teachers: false,
    hackathon: true,
    simulations: true,
    trainings: true,
    aiTools: true,
  },
  FULL: {
    teachers: true,
    hackathon: true,
    simulations: true,
    trainings: true,
    aiTools: true,
  },
};

export function presetFor(type: TenantType): TenantFeatureSet {
  return { ...TENANT_TYPE_PRESETS[type] };
}

export function isTenantType(value: string): value is TenantType {
  return (TENANT_TYPES as readonly string[]).includes(value);
}

/** The database columns backing each feature. */
interface TenantFeatureColumns {
  teachersEnabled: boolean;
  hackathonEnabled: boolean;
  simulationsEnabled: boolean;
  trainingsEnabled: boolean;
  aiToolsEnabled: boolean;
}

export function toFeatureSet(columns: TenantFeatureColumns): TenantFeatureSet {
  return {
    teachers: columns.teachersEnabled,
    hackathon: columns.hackathonEnabled,
    simulations: columns.simulationsEnabled,
    trainings: columns.trainingsEnabled,
    aiTools: columns.aiToolsEnabled,
  };
}

export function toFeatureColumns(features: TenantFeatureSet): TenantFeatureColumns {
  return {
    teachersEnabled: features.teachers,
    hackathonEnabled: features.hackathon,
    simulationsEnabled: features.simulations,
    trainingsEnabled: features.trainings,
    aiToolsEnabled: features.aiTools,
  };
}

/** Every module on — used for super admins and for tenant-less contexts. */
export function allFeatures(): TenantFeatureSet {
  return {
    teachers: true,
    hackathon: true,
    simulations: true,
    trainings: true,
    aiTools: true,
  };
}

/**
 * Resolves what a tenant may use.
 *
 * A missing tenant id (the platform owner, who belongs to no organisation)
 * gets everything — the restriction is about what a customer bought, not
 * about who is looking.
 */
export async function getTenantFeatures(
  tenantId: string | null | undefined
): Promise<TenantFeatureSet> {
  if (!tenantId) return allFeatures();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      teachersEnabled: true,
      hackathonEnabled: true,
      simulationsEnabled: true,
      trainingsEnabled: true,
      aiToolsEnabled: true,
    },
  });

  // An unknown tenant is a data problem, not an entitlement question; failing
  // open here would be worse than showing an empty panel.
  if (!tenant) return allFeatures();

  return toFeatureSet(tenant);
}

export class FeatureDisabledError extends Error {
  readonly statusCode = 404;
  readonly code = "MODULE_NOT_ENABLED";

  constructor(feature: TenantFeature) {
    super(`Module not enabled for this organization: ${feature}`);
    this.name = "FeatureDisabledError";
  }
}

/**
 * Server-side gate. Hiding a menu entry is presentation; this is the part
 * that actually stops someone who types the URL.
 */
export async function assertFeatureEnabled(
  tenantId: string | null | undefined,
  feature: TenantFeature
): Promise<void> {
  const features = await getTenantFeatures(tenantId);
  if (!features[feature]) {
    throw new FeatureDisabledError(feature);
  }
}

export async function hasFeature(
  tenantId: string | null | undefined,
  feature: TenantFeature
): Promise<boolean> {
  const features = await getTenantFeatures(tenantId);
  return features[feature];
}
