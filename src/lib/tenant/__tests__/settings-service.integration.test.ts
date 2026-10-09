import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateTenantSettings, getTenantSettings } from "@/lib/tenant/settings-service";
import { resetRedisMemoryForTests } from "@/lib/redis/client";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("settings-service integration", () => {
  it("updates tenant settings and invalidates cache", async () => {
    resetRedisMemoryForTests();

    const tenant = await prisma.tenant.create({
      data: {
        name: "Settings Tenant",
        status: "ACTIVE",
        seatLimit: 10,
        seatsUsed: 0,
      },
    });

    await prisma.tenantSettings.create({ data: { tenantId: tenant.id } });

    const updated = await updateTenantSettings(tenant.id, {
      name: "Updated Tenant Name",
      participationCertificate: false,
      authorizedContact: "Jane Admin",
    });

    expect(updated?.name).toBe("Updated Tenant Name");
    expect(updated?.participationCertificate).toBe(false);
    expect(updated?.authorizedContact).toBe("Jane Admin");

    const cached = await getTenantSettings(tenant.id);
    expect(cached?.name).toBe("Updated Tenant Name");

    await prisma.tenantSettings.delete({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
