import { describe, expect, it } from "vitest";
import { canAccessJobPayload } from "@/lib/queue/job-access";

describe("canAccessJobPayload", () => {
  const payload = { userId: "user-1", tenantId: "tenant-1" };

  it("allows the job owner within the same tenant", () => {
    expect(
      canAccessJobPayload(payload, {
        id: "user-1",
        role: "TENANT_ADMIN",
        tenantId: "tenant-1",
      })
    ).toBe(true);
  });

  it("denies a different user in the same tenant", () => {
    expect(
      canAccessJobPayload(payload, {
        id: "user-2",
        role: "TENANT_ADMIN",
        tenantId: "tenant-1",
      })
    ).toBe(false);
  });

  it("denies cross-tenant access for the job owner", () => {
    expect(
      canAccessJobPayload(payload, {
        id: "user-1",
        role: "TENANT_ADMIN",
        tenantId: "tenant-2",
      })
    ).toBe(false);
  });

  it("allows super admins regardless of scope", () => {
    expect(
      canAccessJobPayload(payload, {
        id: "other-user",
        role: "SUPER_ADMIN",
        tenantId: null,
      })
    ).toBe(true);
  });
});
