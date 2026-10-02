import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { supportTicketEmail } from "@/lib/email/templates";
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
