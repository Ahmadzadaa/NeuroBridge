import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantSettings } from "@/lib/tenant/settings-service";
import { resetRedisMemoryForTests } from "@/lib/redis/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    tenantSettings: { upsert: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({
      tenant: { update: vi.fn() },
      tenantSettings: { upsert: vi.fn() },
    })),
  },
}));

import { prisma } from "@/lib/prisma";

describe("settings-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRedisMemoryForTests();
  });

  it("loads tenant settings with defaults", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      name: "Acme",
      website: null,
      phone: null,
      email: null,
      address: null,
      settings: null,
    } as never);

    const settings = await getTenantSettings("t1");
    expect(settings?.name).toBe("Acme");
    expect(settings?.participationCertificate).toBe(true);
  });
});
