import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueCertificate, listUserCertificates } from "@/lib/certificates/certificate-service";
import { CertificateAlreadyIssuedError } from "@/lib/certificates/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    participant: { findFirst: vi.fn() },
    certificate: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/tenant/settings-service", () => ({
  getTenantSettings: vi.fn().mockResolvedValue({ participationCertificate: true }),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  recordAudit: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

describe("certificate-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists user certificates", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([
      { id: "c1", userId: "user-1", type: "PARTICIPATION", issuedAt: new Date(), pdfUrl: null },
    ]);

    const list = await listUserCertificates("user-1");
    expect(list).toHaveLength(1);
  });

  it("issues certificate when participant exists", async () => {
    vi.mocked(prisma.participant.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockResolvedValue({
      id: "c1",
      type: "PARTICIPATION",
      issuedAt: new Date(),
      pdfUrl: null,
    } as never);

    const cert = await issueCertificate({
      userId: "user-1",
      tenantId: "tenant-1",
      type: "PARTICIPATION",
    });

    expect(cert.type).toBe("PARTICIPATION");
  });

  it("rejects duplicate certificates", async () => {
    vi.mocked(prisma.participant.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue({ id: "existing" } as never);

    await expect(
      issueCertificate({
        userId: "user-1",
        tenantId: "tenant-1",
        type: "PARTICIPATION",
      })
    ).rejects.toBeInstanceOf(CertificateAlreadyIssuedError);
  });
});
