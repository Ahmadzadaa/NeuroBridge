import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  supportTicket: { findUnique: vi.fn(), update: vi.fn((args: unknown) => args) },
  supportMessage: { create: vi.fn((args: unknown) => args) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { addMessage, getThread, isUnread, setStatus } from "@/lib/support/support-service";

const admin = { id: "u1", role: "TENANT_ADMIN", tenantId: "t1" };
const otherAdmin = { id: "u2", role: "TENANT_ADMIN", tenantId: "t2" };
const staff = { id: "s1", role: "SUPER_ADMIN", tenantId: null };

describe("support tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.supportTicket.findUnique.mockResolvedValue({ id: "k1", tenantId: "t1", status: "OPEN" });
  });

  it("keeps one organisation out of another's tickets", async () => {
    await expect(getThread(otherAdmin, "k1")).rejects.toMatchObject({ statusCode: 404 });
    await expect(addMessage(otherAdmin, "k1", "hi")).rejects.toMatchObject({ statusCode: 404 });
    await expect(setStatus(otherAdmin, "k1", "RESOLVED")).rejects.toMatchObject({ statusCode: 404 });
    expect(db.supportMessage.create).not.toHaveBeenCalled();
  });

  it("passes the turn: a staff reply marks it answered, the organisation's reply opens it again", async () => {
    await addMessage(staff, "k1", "We fixed it");
    expect(db.supportMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromStaff: true }) }));
    expect(db.supportTicket.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ANSWERED" }) }));

    await addMessage(admin, "k1", "Still broken");
    expect(db.supportMessage.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromStaff: false }) }));
    expect(db.supportTicket.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "OPEN" }) }));
  });

  it("counts a thread unread when something came after the last look", () => {
    const at = new Date("2026-10-01T10:00:00Z");
    expect(isUnread(at, null)).toBe(true);
    expect(isUnread(at, new Date("2026-10-01T09:00:00Z"))).toBe(true);
    expect(isUnread(at, at)).toBe(false);
  });
});
