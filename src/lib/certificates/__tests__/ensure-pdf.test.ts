import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ certificate: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn() } }));
const render = vi.hoisted(() => vi.fn(async () => new Uint8Array([37, 80, 68, 70])));
const store = vi.hoisted(() => vi.fn(async () => ({ key: "certificates/t1/u1/c1.pdf", hash: "h" })));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/certificates/pdf-renderer", () => ({ renderCertificatePdf: render }));
vi.mock("@/lib/certificates/storage", () => ({ storeCertificatePdf: store }));
vi.mock("@/lib/audit/audit-service", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/tenant/settings-service", () => ({ getTenantSettings: vi.fn() }));

import { ensureCertificatePdf } from "@/lib/certificates/issue-service";

const row = (over: object = {}) => ({
  id: "c1", tenantId: "t1", userId: "u1", type: "ACHIEVEMENT", templateId: null, recipientName: "Aysel Quliyeva",
  title: "Startap Proqramı", locale: "az", pdfPath: null, tenant: { name: "Demo Universitet" }, ...over,
});

describe("ensureCertificatePdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a certificate recorded without a document from its own snapshot", async () => {
    db.certificate.findUniqueOrThrow.mockResolvedValue(row());
    db.certificate.updateMany.mockResolvedValue({ count: 1 });

    expect(await ensureCertificatePdf("c1")).toBe("certificates/t1/u1/c1.pdf");
    const [template, data] = render.mock.calls[0] as unknown as [{ type: string }, { recipientName: string; body: string; issuerName: string }];
    expect(template.type).toBe("ACHIEVEMENT");
    expect(data.recipientName).toBe("Aysel Quliyeva");
    expect(data.body).toContain("Startap Proqramı");
    expect(data.issuerName).toBe("Demo Universitet");
    expect(db.certificate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1", pdfPath: null }, data: expect.objectContaining({ templateId: "achievement" }) })
    );
  });

  it("never re-renders a certificate that already has its file", async () => {
    db.certificate.findUniqueOrThrow.mockResolvedValue(row({ pdfPath: "certificates/t1/u1/c1.pdf" }));
    expect(await ensureCertificatePdf("c1")).toBe("certificates/t1/u1/c1.pdf");
    expect(render).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });
});
