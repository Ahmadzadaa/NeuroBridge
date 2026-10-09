import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { supportReplyEmail, supportTicketEmail } from "@/lib/email/templates";
import { notifyPlatformTeam, notifyUsers } from "@/lib/notifications/notification-service";
import { localeUrl } from "@/lib/app-url";
import { personName } from "@/lib/support/support-service";

/**
 * Where new support requests are announced. Falls back to the demo-request
 * inbox, then to the sender identity, so a deployment that sets nothing
 * still delivers somewhere real.
 */
export function supportNotificationRecipient(): string | null {
  return process.env.SUPPORT_NOTIFICATION_EMAIL || process.env.LEADS_NOTIFICATION_EMAIL || process.env.EMAIL_FROM || null;
}

/**
 * Emails the platform team about a new request. Never throws: the request is
 * already saved and visible in the panel, so a mail problem is only logged.
 */
export async function notifyNewTicket(ticketId: string, origin: string): Promise<boolean> {
  await notifyTeamInApp(ticketId, "SUPPORT_TICKET_NEW");
  const to = supportNotificationRecipient();
  if (!to) {
    console.warn(`Support ticket ${ticketId} saved but no SUPPORT_NOTIFICATION_EMAIL, LEADS_NOTIFICATION_EMAIL or EMAIL_FROM is configured`);
    return false;
  }
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        subject: true,
        createdAt: true,
        tenant: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 1, select: { body: true } },
      },
    });
    if (!ticket) return false;
    const locale = process.env.SUPPORT_NOTIFICATION_LOCALE;
    const result = await sendEmail({
      to,
      ...supportTicketEmail({
        organisation: ticket.tenant.name,
        authorName: personName(ticket.createdBy),
        authorEmail: ticket.createdBy.email,
        topic: ticket.subject,
        message: ticket.messages[0]?.body ?? "",
        ticketUrl: localeUrl(origin, `/super-admin/support/${ticketId}`, locale),
        submittedAt: ticket.createdAt,
        locale,
      }),
    });
    if (!result.sent) console.error(`Support ticket ${ticketId} saved but notification failed: ${result.error}`);
    return result.sent;
  } catch (error) {
    console.error(`Support ticket ${ticketId} saved but notification failed`, error);
    return false;
  }
}

/** The bell for every super admin; email is sent separately. */
async function notifyTeamInApp(ticketId: string, type: "SUPPORT_TICKET_NEW" | "SUPPORT_MESSAGE_NEW") {
  const ticket = await prisma.supportTicket
    .findUnique({ where: { id: ticketId }, select: { subject: true, tenant: { select: { name: true } } } })
    .catch(() => null);
  if (!ticket) return;
  await notifyPlatformTeam({ type, params: { organisation: ticket.tenant.name, subject: ticket.subject }, link: `/super-admin/support/${ticketId}` });
}

/**
 * A new message in a conversation: the other side hears about it, in the
 * bell and by email. Staff replies reach the person who opened the request,
 * in their own language; organisation replies reach the platform team.
 * Never throws, like notifyNewTicket.
 */
export async function notifyReply(ticketId: string, fromStaff: boolean, origin: string): Promise<boolean> {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        subject: true,
        tenant: { select: { name: true } },
        createdBy: { select: { id: true, email: true, language: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, author: { select: { firstName: true, lastName: true, email: true } }, attachments: { select: { name: true } } },
        },
      },
    });
    const last = ticket?.messages[0];
    if (!ticket || !last) return false;

    if (fromStaff) {
      await notifyUsers([ticket.createdBy.id], { type: "SUPPORT_REPLY", params: { subject: ticket.subject }, link: `/tenant/support/${ticketId}` });
    } else {
      await notifyTeamInApp(ticketId, "SUPPORT_MESSAGE_NEW");
    }

    const to = fromStaff ? ticket.createdBy.email : supportNotificationRecipient();
    if (!to) return false;
    const locale = fromStaff ? ticket.createdBy.language : process.env.SUPPORT_NOTIFICATION_LOCALE;
    const result = await sendEmail({
      to,
      ...supportReplyEmail({
        audience: fromStaff ? "tenant" : "staff",
        organisation: ticket.tenant.name,
        authorName: personName(last.author),
        topic: ticket.subject,
        // A message of only files still says what was sent.
        message: [last.body, ...last.attachments.map((f) => `📎 ${f.name}`)].filter(Boolean).join("\n"),
        ticketUrl: localeUrl(origin, fromStaff ? `/tenant/support/${ticketId}` : `/super-admin/support/${ticketId}`, locale),
        locale,
      }),
    });
    if (!result.sent) console.error(`Support reply on ${ticketId} saved but notification failed: ${result.error}`);
    return result.sent;
  } catch (error) {
    console.error(`Support reply on ${ticketId} saved but notification failed`, error);
    return false;
  }
}
