import { describe, expect, it, vi } from "vitest";
import { accessibleSimulationsWhere, canAccessSimulation } from "@/lib/programs/simulation-access";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

function db(enrolled: boolean, programs: { programSimulations: { simulationType: string }[] }[] = []) {
  const findFirst = vi.fn(async () => (enrolled ? { id: "p1" } : null));
  const findMany = vi.fn(async () => programs);
  return { participant: { findFirst }, program: { findMany } } as never as Parameters<typeof canAccessSimulation>[0] & {
    participant: { findFirst: typeof findFirst };
  };
}

describe("canAccessSimulation", () => {
  const base = { userId: "u1", tenantId: "t1" };

  it("requires the platform simulation to be in one of the participant's programmes", async () => {
    const d = db(true);
    await expect(canAccessSimulation(d, { ...base, simulation: { key: "leadership", tenantId: null } })).resolves.toBe(true);
    expect(d.participant.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        status: "ACTIVE",
        program: { tenantId: "t1", programSimulations: { some: { simulationType: "leadership" } } },
      },
      select: { id: true },
    });
    await expect(canAccessSimulation(db(false), { ...base, simulation: { key: "leadership", tenantId: null } })).resolves.toBe(false);
  });

  it("opens the tenant's own scenarios to its active participants only", async () => {
    const d = db(true);
    await expect(canAccessSimulation(d, { ...base, simulation: { key: "custom_x", tenantId: "t1" } })).resolves.toBe(true);
    expect(d.participant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", status: "ACTIVE", program: { tenantId: "t1" } } })
    );
  });

  it("never opens another tenant's scenario or works without a tenant", async () => {
    const d = db(true);
    await expect(canAccessSimulation(d, { ...base, simulation: { key: "custom_y", tenantId: "t2" } })).resolves.toBe(false);
    await expect(canAccessSimulation(d, { userId: "u1", tenantId: null, simulation: { key: "x", tenantId: null } })).resolves.toBe(false);
    expect(d.participant.findFirst).not.toHaveBeenCalled();
  });
});

describe("accessibleSimulationsWhere", () => {
  it("lists only the programmes' platform simulations plus the tenant's own", async () => {
    const where = await accessibleSimulationsWhere(
      db(true, [{ programSimulations: [{ simulationType: "startup_management" }] }, { programSimulations: [{ simulationType: "startup_management" }, { simulationType: "leadership" }] }]),
      "u1",
      "t1"
    );
    expect(where).toEqual({ OR: [{ tenantId: null, key: { in: ["startup_management", "leadership"] } }, { tenantId: "t1" }] });
  });

  it("shows nothing to someone with no active programme", async () => {
    expect(await accessibleSimulationsWhere(db(false, []), "u1", "t1")).toEqual({ id: { in: [] } });
    expect(await accessibleSimulationsWhere(db(false, []), "u1", null)).toEqual({ id: { in: [] } });
  });
});
