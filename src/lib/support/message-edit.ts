import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { SupportAttachmentError } from "@/lib/support/attachments";
import { SupportTicketNotFoundError, type SupportActor } from "@/lib/support/support-service";

/**
 * Changing or removing a message one wrote. Only the author may; an edit is
 * marked as such for the other side, and a removal leaves a placeholder so
 * the replies around it still make sense.
 */
export const editMessageSchema = z.object({ body: z.string().trim().max(5000) });

/** The author's own, still-present message, in a ticket they can see. */
async function ownMessage(actor: SupportActor, messageId: string) {
  const message = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      ticketId: true,
      authorId: true,
      deletedAt: true,
      ticket: { select: { tenantId: true } },
      attachments: { select: { id: true, key: true } },
    },
  });
  const visible = message && (actor.role === "SUPER_ADMIN" || message.ticket.tenantId === actor.tenantId);
  // Someone else's message looks the same as a missing one: no hint that it exists.
  if (!message || !visible || message.authorId !== actor.id || message.deletedAt) throw new SupportTicketNotFoundError();
  return message;
}

export async function editMessage(actor: SupportActor, messageId: string, body: string) {
  const message = await ownMessage(actor, messageId);
  // Text may only be emptied when files still say something.
  if (!body.trim() && message.attachments.length === 0) throw new SupportAttachmentError("EMPTY_MESSAGE");
  await prisma.supportMessage.update({
    where: { id: messageId },
    // Old translations describe the old text.
    data: { body, editedAt: new Date(), translations: null },
  });
  return { ticketId: message.ticketId };
}

export async function deleteMessage(actor: SupportActor, messageId: string) {
  const message = await ownMessage(actor, messageId);
  await prisma.$transaction([
    prisma.supportAttachment.deleteMany({ where: { messageId } }),
    prisma.supportMessage.update({ where: { id: messageId }, data: { body: "", translations: null, deletedAt: new Date() } }),
  ]);
  // The bytes go last: if storage is slow or down, the message is already gone from the thread.
  const storage = getStorage();
  await Promise.all(message.attachments.map((a) => storage.delete(a.key).catch(() => undefined)));
  return { ticketId: message.ticketId, files: message.attachments.length };
}
