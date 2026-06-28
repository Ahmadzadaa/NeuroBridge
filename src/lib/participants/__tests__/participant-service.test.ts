import { describe, expect, it, vi } from "vitest";
import { listTenantParticipants } from "@/lib/participants/participant-service";

vi.mock("@/lib/db/tenant-context", () => ({
  withTenantContext: vi.fn((_ctx, fn) =>
    fn({
      participant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "part1",
            status: "ACTIVE",
            registrationDate: new Date(),
            user: {
              id: "u1",
              email: "user@test.com",
              firstName: "Test",
              lastName: "User",
            },
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
    })
  ),
}));

describe("participant-service", () => {
  it("lists tenant participants with pagination", async () => {
    const result = await listTenantParticipants(
      { tenantId: "t1", userId: "admin", role: "TENANT_ADMIN", isSuperAdmin: false },
      "t1",
      { page: 1, pageSize: 25, skip: 0 }
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.user.email).toBe("user@test.com");
  });
});
