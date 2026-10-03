import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { certificate: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  listUserCertificates,
  listTenantCertificates,
} from "@/lib/certificates/certificate-service";

const row = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  type: "PARTICIPATION",
  title: "Sahibkarlıq Akselerasiya Proqramı 2026",
  serialNumber: "BIZ-2026-DEM-000001",
  issuedAt: new Date("2026-08-01"),
  revokedAt: null,
  pdfPath: "tenant-1/c1.pdf",
  recipientName: "Ahmet Yılmaz",
  tenant: { name: "Demo Teknopark" },
  ...over,
});

describe("certificate-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports a stored PDF as available without leaking its path", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([row()] as never);

    const [cert] = await listUserCertificates("user-1");

    expect(cert.hasPdf).toBe(true);
    expect(cert.serialNumber).toBe("BIZ-2026-DEM-000001");
    expect(cert).toMatchObject({ recipientName: "Ahmet Yılmaz", issuer: "Demo Teknopark" });
    // The storage location must never reach the client.
    expect(cert).not.toHaveProperty("pdfPath");
  });

  it("marks a certificate without a rendered PDF as unavailable", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([
      row({ pdfPath: null }),
    ] as never);

    const [cert] = await listUserCertificates("user-1");
    expect(cert.hasPdf).toBe(false);
  });

  it("keeps a revocation visible to the holder", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([
      row({ revokedAt: new Date("2026-08-10") }),
    ] as never);

    const [cert] = await listUserCertificates("user-1");
    expect(cert.revokedAt).toBeInstanceOf(Date);
  });

  it("scopes the tenant listing by tenantId and caps the page", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([] as never);

    await listTenantCertificates("tenant-1", 50);

    expect(prisma.certificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1" },
        take: 50,
      })
    );
  });
});
