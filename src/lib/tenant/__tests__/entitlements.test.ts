import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ tenant: { findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { assertProgramModules, isTestTenant } from "@/lib/tenant/entitlements";

const tenant = (on: Partial<Record<"teachers" | "hackathon" | "simulations" | "trainings" | "aiTools", boolean>>) => ({
  teachersEnabled: on.teachers ?? false,
  hackathonEnabled: on.hackathon ?? false,
  simulationsEnabled: on.simulations ?? false,
  trainingsEnabled: on.trainings ?? false,
  aiToolsEnabled: on.aiTools ?? false,
});
const body = (over: Partial<{ type: string; simulations: string[]; trainings: string[]; aiTools: string[] }> = {}) => ({
  type: "entrepreneurship_training",
  simulations: [],
  trainings: [],
  aiTools: [],
  ...over,
});

describe("programme modules follow what the organisation bought", () => {
  it("lets through what was bought", async () => {
    db.tenant.findUnique.mockResolvedValue(tenant({ simulations: true, trainings: true }));
    await expect(assertProgramModules(db as never, "t1", body({ simulations: ["leadership"], trainings: ["finance_training"] }))).resolves.toBeUndefined();
  });

  it("refuses modules that were not bought, naming them", async () => {
    db.tenant.findUnique.mockResolvedValue(tenant({ simulations: true }));
    await expect(
      assertProgramModules(db as never, "t1", body({ type: "hackathon", trainings: ["finance_training"], aiTools: ["ai_mentor"] }))
    ).rejects.toMatchObject({ statusCode: 409, code: "MODULE_NOT_ENABLED", modules: ["trainings", "aiTools", "hackathon"] });
  });

  it("keeps automated-test organisations out of the builder", () => {
    expect(isTestTenant({ name: "E2E Test University", email: "e2e-1@uni.test" })).toBe(true);
    expect(isTestTenant({ name: "Real University", email: "admin@uni.test" })).toBe(true);
    expect(isTestTenant({ name: "Demo Teknopark", email: "admin@demo-teknopark.com" })).toBe(false);
  });
});
