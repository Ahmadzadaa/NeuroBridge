import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  issueCertificate,
  listUserCertificates,
} from "@/lib/certificates/certificate-service";
import {
  CertificateAlreadyIssuedError,
  CertificateDisabledError,
} from "@/lib/certificates/errors";
import { updateTenantSettings } from "@/lib/tenant/settings-service";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("certificate service integration", () => {
  it("issues and lists certificates for participants", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Certificate Tenant",
        status: "ACTIVE",
        seatLimit: 10,
        seatsUsed: 1,
      },
    });

    await prisma.tenantSettings.create({ data: { tenantId: tenant.id } });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `cert-${Date.now()}@test.com`,
        passwordHash: "hash",
        role: "PARTICIPANT",
      },
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Cert Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(Date.now() - 86400000),
        applicationEnd: new Date(Date.now() + 86400000),
        participantLimit: 10,
      },
    });

    await prisma.participant.create({
      data: { programId: program.id, userId: user.id, status: "ACTIVE" },
    });

    const certificate = await issueCertificate({
      userId: user.id,
      tenantId: tenant.id,
      type: "PARTICIPATION",
      issuedByUserId: user.id,
    });

    expect(certificate.type).toBe("PARTICIPATION");

    const list = await listUserCertificates(user.id);
    expect(list).toHaveLength(1);

    await expect(
      issueCertificate({
        userId: user.id,
        tenantId: tenant.id,
        type: "PARTICIPATION",
      })
    ).rejects.toBeInstanceOf(CertificateAlreadyIssuedError);

    await updateTenantSettings(tenant.id, { participationCertificate: false });
    await prisma.certificate.deleteMany({ where: { userId: user.id } });

    await expect(
      issueCertificate({
        userId: user.id,
        tenantId: tenant.id,
        type: "PARTICIPATION",
      })
    ).rejects.toBeInstanceOf(CertificateDisabledError);

    await prisma.certificate.deleteMany({ where: { userId: user.id } });
    await prisma.participant.deleteMany({ where: { userId: user.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tenantSettings.delete({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
