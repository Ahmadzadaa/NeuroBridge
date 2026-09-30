import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { leadNotificationEmail } from "@/lib/email/templates";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Demo requests from the public marketing site.
 *
 * Two things make this different from every other write path in the app:
 * there is no session, and there is no tenant. So the protections that
 * normally come from authorisation have to come from the shape of the input
 * instead — a honeypot, a rate limit at the route, and strict validation.
 */

export interface LeadInput {
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  seatCount?: string | null;
  message?: string | null;
  locale?: string | null;
  source?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface LeadResult {
  id: string;
  /** Whether the sales notification actually went out. */
  notified: boolean;
}

function resolveLocale(value?: string | null): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

/**
 * Where demo requests are announced. Falls back to the sender identity so a
 * deployment that forgets the variable still delivers somewhere real rather
 * than dropping the lead silently.
 */
export function notificationRecipient(): string | null {
  return process.env.LEADS_NOTIFICATION_EMAIL || process.env.EMAIL_FROM || null;
}

export async function createLead(input: LeadInput): Promise<LeadResult> {
  const locale = resolveLocale(input.locale);

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone ?? null,
      seatCount: input.seatCount ?? null,
      message: input.message ?? null,
      locale,
      source: input.source ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
    select: { id: true, createdAt: true },
  });

  // The row is already committed. A failed notification must never turn into
  // a failed submission — the visitor did their part, and the lead is safe.
  let notified = false;
  const to = notificationRecipient();
  if (to) {
    const result = await sendEmail({
      to,
      ...leadNotificationEmail({
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone ?? null,
        seatCount: input.seatCount ?? null,
        message: input.message ?? null,
        locale,
        submittedAt: lead.createdAt,
      }),
    });
    notified = result.sent;
    if (!result.sent) {
      console.error(`Lead ${lead.id} saved but notification failed: ${result.error}`);
    }
  } else {
    console.warn(
      `Lead ${lead.id} saved but no LEADS_NOTIFICATION_EMAIL or EMAIL_FROM is configured`,
    );
  }

  return { id: lead.id, notified };
}
