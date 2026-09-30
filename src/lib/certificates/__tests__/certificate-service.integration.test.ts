import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { issueCertificates } from "@/lib/certificates/issue-service";
import { listUserCertificates } from "@/lib/certificates/certificate-service";
import { CertificateDisabledError } from "@/lib/certificates/errors";
import { updateTenantSettings } from "@/lib/tenant/settings-service";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("certificate issuance integration", () => {
  it("delivers a certificate to the participant's account, once", async () => {
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
        firstName: "Nərgiz",
        lastName: "Ələkbərova",
      },
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Cert Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(Date.now() - 86_400_000),
        applicationEnd: new Date(Date.now() + 86_400_000),
        participantLimit: 10,
      },
    });
    await prisma.participant.create({
      data: { programId: program.id, userId: user.id, status: "ACTIVE" },
    });

    const issue = () =>
      issueCertificates({
        tenantId: tenant.id,
        issuedByUserId: user.id,
        templateId: "participation",
        programId: program.id,
        title: program.name,
        body: "Bu sertifikat {program} proqramı üçün verilir.",
        recipients: [{ userId: user.id, name: "Nərgiz Ələkbərova" }],
      });

    const [first] = await issue();
    expect(first.status).toBe("issued");

    const list = await listUserCertificates(user.id);
    expect(list).toHaveLength(1);
    expect(list[0].hasPdf).toBe(true);
    expect(list[0].serialNumber).toMatch(/^BIZ-\d{4}-[A-Z]{3}-\d{6}$/);

    // Re-running a bulk issue after adding late participants is routine, so a
    // repeat must report the existing certificate rather than duplicate it.
    const [second] = await issue();
    expect(second.status).toBe("already");
    expect(await listUserCertificates(user.id)).toHaveLength(1);

    // A tenant that switched this certificate type off must not receive more.
    await updateTenantSettings(tenant.id, { participationCertificate: false });
    await prisma.certificate.deleteMany({ where: { userId: user.id } });
    await expect(issue()).rejects.toBeInstanceOf(CertificateDisabledError);

    await prisma.certificate.deleteMany({ where: { userId: user.id } });
    await prisma.certificateSequence.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.participant.deleteMany({ where: { userId: user.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tenantSettings.delete({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
