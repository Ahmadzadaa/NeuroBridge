import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPrograms } from "@/lib/programs/program-service";
import { resetRedisMemoryForTests } from "@/lib/redis/client";

vi.mock("@/lib/db/tenant-context", () => ({
  withTenantContext: vi.fn((_ctx, fn) =>
    fn({
      program: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "p1",
            name: "Program 1",
            type: "hackathon",
            applicationStart: new Date(),
            applicationEnd: new Date(),
            simulationStart: null,
            simulationEnd: null,
            participantLimit: 50,
            applicationToken: "token",
            createdAt: new Date(),
            _count: { participants: 3 },
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
    })
  ),
}));

describe("program-service", () => {
  beforeEach(() => {
    resetRedisMemoryForTests();
  });

  it("returns paginated programs with participant counts", async () => {
    const result = await listPrograms(
      { tenantId: "t1", userId: "u1", role: "TENANT_ADMIN", isSuperAdmin: false },
      "t1",
      { page: 1, pageSize: 25, skip: 0 }
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.participantCount).toBe(3);
    expect(result.total).toBe(1);
  });
});
