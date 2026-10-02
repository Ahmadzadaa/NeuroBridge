import { prisma } from "@/lib/prisma";

/**
 * In-app notifications: the list under the bell.
 *
 * Every type has an entry in `notifications.types` in each language, with
 * `params` filling its placeholders, so a notification reads in whatever
 * language the person uses when they open it.
 */
export const NOTIFICATION_TYPES = [
  "SUPPORT_TICKET_NEW",
  "SUPPORT_MESSAGE_NEW",
  "SUPPORT_REPLY",
  "LEAD_NEW",
  "ASSESSMENTS_COMPLETED",
  "AI_BUDGET_EXHAUSTED",
  "CERTIFICATE_ISSUED",
  "SIMULATION_GRADED",
  "HACKATHON_RESULTS",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationInput = {
  type: NotificationType;
  params?: Record<string, string | number>;
  /** In-app path without the locale prefix. */
  link?: string;
};

const LIST_LIMIT = 30;
/** Old read notifications are dropped so the table does not grow forever. */
const KEEP_READ_DAYS = 90;

/**
 * Creates the same notification for several people. Never throws: whatever
 * triggered it (a reply, a grade, a certificate) has already happened, and a
 * missing notice must not undo or fail it.
 */
export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({ userId, type: input.type, params: JSON.stringify(input.params ?? {}), link: input.link ?? null })),
    });
  } catch (error) {
    console.error(`Notification ${input.type} could not be stored`, error);
  }
}

/** Everyone on the platform team. */
export async function notifyPlatformTeam(input: NotificationInput): Promise<void> {
  const team = await Promise.resolve()
    .then(() => prisma.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } }))
    .catch(() => []);
  await notifyUsers(
    team.map((u) => u.id),
    input
  );
}

/** An organisation's admins (and, when asked, its read-only viewers). */
export async function notifyTenantAdmins(tenantId: string, input: NotificationInput, options: { viewers?: boolean } = {}): Promise<void> {
  const roles = options.viewers ? ["TENANT_ADMIN", "TENANT_VIEWER"] : ["TENANT_ADMIN"];
  const admins = await Promise.resolve()
    .then(() => prisma.user.findMany({ where: { tenantId, role: { in: roles } }, select: { id: true } }))
    .catch(() => []);
  await notifyUsers(
    admins.map((u) => u.id),
    input
  );
}

export async function listNotifications(userId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, type: true, params: true, link: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      params: safeParams(n.params),
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/** Marks some (or, with no ids, all) of a person's notifications read; only their own are touched. */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const now = new Date();
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: now },
  });
  await prisma.notification.deleteMany({
    where: { userId, readAt: { lt: new Date(now.getTime() - KEEP_READ_DAYS * 24 * 60 * 60 * 1000) } },
  });
}

function safeParams(raw: string): Record<string, string | number> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string | number>) : {};
  } catch {
    return {};
  }
}
