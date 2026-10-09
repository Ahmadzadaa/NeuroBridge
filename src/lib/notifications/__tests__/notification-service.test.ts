import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  notification: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  user: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { listNotifications, markRead, notifyPlatformTeam, notifyUsers } from "@/lib/notifications/notification-service";

describe("notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores one row per person, once each", async () => {
    await notifyUsers(["u1", "u2", "u1", ""], { type: "SUPPORT_REPLY", params: { subject: "Hi" }, link: "/tenant/support/t1" });
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u1", type: "SUPPORT_REPLY", params: '{"subject":"Hi"}', link: "/tenant/support/t1" },
        { userId: "u2", type: "SUPPORT_REPLY", params: '{"subject":"Hi"}', link: "/tenant/support/t1" },
      ],
    });
  });

  it("never fails what triggered it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    db.notification.createMany.mockRejectedValue(new Error("db down"));
    db.user.findMany.mockRejectedValue(new Error("db down"));
    await expect(notifyUsers(["u1"], { type: "LEAD_NEW" })).resolves.toBeUndefined();
    await expect(notifyPlatformTeam({ type: "LEAD_NEW" })).resolves.toBeUndefined();
  });

  it("only ever reads and marks the person's own notifications", async () => {
    db.notification.findMany.mockResolvedValue([{ id: "n1", type: "LEAD_NEW", params: "{oops", link: null, readAt: null, createdAt: new Date("2026-10-03T10:00:00Z") }]);
    db.notification.count.mockResolvedValue(1);
    const list = await listNotifications("u1");
    expect(db.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(list.items[0]).toMatchObject({ id: "n1", params: {}, read: false });

    await markRead("u1", ["n1", "n2"]);
    expect(db.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", readAt: null, id: { in: ["n1", "n2"] } } }));
  });
});
