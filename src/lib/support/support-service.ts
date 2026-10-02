import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Support conversations between an organisation's admins and the platform
 * team. The status says whose turn it is: OPEN means the platform team owes a
 * reply, ANSWERED means the organisation does. Either side may resolve a
 * ticket; a new message reopens it.
 */
export const SUPPORT_STATUSES = ["OPEN", "ANSWERED", "RESOLVED"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const newTicketSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(1).max(5000),
});
export const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) });
/** ANSWERED is never set by hand: it follows a reply from the platform team. */
export const statusSchema = z.object({ status: z.enum(["OPEN", "RESOLVED"]) });

export class SupportTicketNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "SUPPORT_TICKET_NOT_FOUND";
  constructor() {
    super("Support ticket not found");
    this.name = "SupportTicketNotFoundError";
  }
}

export type SupportActor = { id: string; role: string; tenantId: string | null };
const isStaff = (actor: SupportActor) => actor.role === "SUPER_ADMIN";

/** A ticket the actor may see: staff see all, an organisation only its own. */
async function ticketFor(actor: SupportActor, ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, tenantId: true, status: true } });
  if (!ticket || (!isStaff(actor) && ticket.tenantId !== actor.tenantId)) throw new SupportTicketNotFoundError();
  return ticket;
}

/** Unread for a side when something was written after it last looked. */
export const isUnread = (lastMessageAt: Date, readAt: Date | null) => !readAt || lastMessageAt > readAt;

export async function createTicket(actor: SupportActor & { tenantId: string }, input: z.infer<typeof newTicketSchema>) {
  const now = new Date();
  return prisma.supportTicket.create({
    data: {
      tenantId: actor.tenantId,
      createdById: actor.id,
      subject: input.subject,
      lastMessageAt: now,
      tenantReadAt: now,
      messages: { create: { authorId: actor.id, body: input.body, createdAt: now } },
    },
    select: { id: true },
  });
}

export async function addMessage(actor: SupportActor, ticketId: string, body: string) {
  await ticketFor(actor, ticketId);
  const staff = isStaff(actor);
  const now = new Date();
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId, authorId: actor.id, fromStaff: staff, body, createdAt: now } }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      // The writer has obviously read the thread; the other side has not.
      data: { status: staff ? "ANSWERED" : "OPEN", lastMessageAt: now, ...(staff ? { staffReadAt: now } : { tenantReadAt: now }) },
    }),
  ]);
}

export async function setStatus(actor: SupportActor, ticketId: string, status: z.infer<typeof statusSchema>["status"]) {
  const ticket = await ticketFor(actor, ticketId);
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  return { from: ticket.status, to: status };
}

/** The full conversation; opening it marks it read for the viewer's side. */
export async function getThread(actor: SupportActor, ticketId: string) {
  await ticketFor(actor, ticketId);
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: isStaff(actor) ? { staffReadAt: new Date() } : { tenantReadAt: new Date() },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, fromStaff: true, createdAt: true, author: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  return ticket;
}

const LIST_LIMIT = 200;
const listSelect = {
  id: true,
  subject: true,
  status: true,
  lastMessageAt: true,
  tenantReadAt: true,
  staffReadAt: true,
  tenant: { select: { name: true } },
  createdBy: { select: { firstName: true, lastName: true, email: true } },
  _count: { select: { messages: true } },
} as const;

export async function listTenantTickets(tenantId: string) {
  return prisma.supportTicket.findMany({ where: { tenantId }, orderBy: { lastMessageAt: "desc" }, take: LIST_LIMIT, select: listSelect });
}

/** The platform team's inbox, newest activity first, with a count per status. */
export async function listAllTickets(status: SupportStatus | null) {
  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({ where: status ? { status } : {}, orderBy: { lastMessageAt: "desc" }, take: LIST_LIMIT, select: listSelect }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: SupportStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return { tickets, counts: Object.fromEntries(SUPPORT_STATUSES.map((s) => [s, countOf(s)])) as Record<SupportStatus, number> };
}

export const personName = (p: { firstName: string | null; lastName: string | null; email: string }) =>
  [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email;
