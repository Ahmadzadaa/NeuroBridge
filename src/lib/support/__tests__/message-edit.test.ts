import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ delete: vi.fn().mockResolvedValue(undefined) }));
const db = vi.hoisted(() => ({
  supportMessage: { findUnique: vi.fn(), update: vi.fn((a: unknown) => a) },
  supportAttachment: { deleteMany: vi.fn((a: unknown) => a) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => ({ getStorage: () => storage }));

import { deleteMessage, editMessage } from "@/lib/support/message-edit";

const author = { id: "u1", role: "TENANT_ADMIN", tenantId: "t1" };
const message = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  ticketId: "k1",
  authorId: "u1",
  deletedAt: null,
  ticket: { tenantId: "t1" },
  attachments: [{ id: "a1", key: "support/t1/k1/x" }],
  ...over,
});

describe("editing and deleting support messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets only the author change a message, and marks it edited", async () => {
    db.supportMessage.findUnique.mockResolvedValue(message());
    await editMessage(author, "m1", "Fixed typo");
    expect(db.supportMessage.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({ body: "Fixed typo", translations: null, editedAt: expect.any(Date) }),
    });

    // Someone else, even in the same organisation or on the platform team, cannot.
    await expect(editMessage({ ...author, id: "u2" }, "m1", "x")).rejects.toMatchObject({ statusCode: 404 });
    await expect(editMessage({ id: "s1", role: "SUPER_ADMIN", tenantId: null }, "m1", "x")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("does not touch a deleted message, nor empty one that has no files", async () => {
    db.supportMessage.findUnique.mockResolvedValue(message({ deletedAt: new Date() }));
    await expect(editMessage(author, "m1", "back")).rejects.toMatchObject({ statusCode: 404 });
    db.supportMessage.findUnique.mockResolvedValue(message({ attachments: [] }));
    await expect(editMessage(author, "m1", "  ")).rejects.toMatchObject({ code: "EMPTY_MESSAGE" });
  });

  it("deleting removes the text and the files, leaving a placeholder", async () => {
    db.supportMessage.findUnique.mockResolvedValue(message());
    expect(await deleteMessage(author, "m1")).toEqual({ ticketId: "k1", files: 1 });
    expect(db.supportAttachment.deleteMany).toHaveBeenCalledWith({ where: { messageId: "m1" } });
    expect(db.supportMessage.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({ body: "", deletedAt: expect.any(Date) }),
    });
    expect(storage.delete).toHaveBeenCalledWith("support/t1/k1/x");
  });
});
