import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  lead: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", twoFactorVerified: true } })) }));
vi.mock("@/lib/audit/audit-service", () => ({ recordAudit: vi.fn(), getClientIp: () => "127.0.0.1" }));

import { PATCH } from "@/app/api/leads/[id]/route";

const asRole = (role: string) =>
  db.user.findUnique.mockResolvedValue({
    id: "u1",
    email: "a@b.c",
    firstName: "A",
    lastName: "B",
    role,
    tenantId: role === "SUPER_ADMIN" ? null : "t1",
    language: "en",
    twoFactorEnabled: false,
    tenant: role === "SUPER_ADMIN" ? null : { status: "ACTIVE" },
  });

const call = (status: unknown, id = "lead1") =>
  PATCH(new Request("http://x/api/leads/" + id, { method: "PATCH", body: JSON.stringify({ status }) }), {
    params: Promise.resolve({ id }),
  });

describe("PATCH /api/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.lead.findUnique.mockResolvedValue({ status: "NEW" });
  });

  it("lets the platform team move a lead along the pipeline", async () => {
    asRole("SUPER_ADMIN");
    const res = await call("CONTACTED");
    expect(res.status).toBe(200);
    expect(db.lead.update).toHaveBeenCalledWith({ where: { id: "lead1" }, data: { status: "CONTACTED" } });
  });

  it("refuses organisation staff: leads are platform data", async () => {
    asRole("TENANT_ADMIN");
    expect((await call("CONTACTED")).status).toBe(403);
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown status and an unknown lead", async () => {
    asRole("SUPER_ADMIN");
    expect((await call("WON")).status).toBe(400);
    db.lead.findUnique.mockResolvedValue(null);
    expect((await call("CLOSED", "missing")).status).toBe(404);
    expect(db.lead.update).not.toHaveBeenCalled();
  });
});
