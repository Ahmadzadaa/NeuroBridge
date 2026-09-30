import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isNoticeSetCurrent, noticeSetVersion } from "@/lib/consent/notices";

/**
 * Student consents (KVKK/GDPR). The log is append-only: every answer is a new
 * row with the text version and time, and the latest row per type is current.
 */

export const CONSENT_TYPES = [
  "PRIVACY_NOTICE",
  "DATA_USE",
  "OPPORTUNITIES",
  "PSYCH_RESULTS_SHARE",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/**
 * Version of the in-app wording for the consents that are not legal notices
 * (their text lives in messages/*.json). PRIVACY_NOTICE and DATA_USE are
 * versioned by the notice set instead, see notices.ts.
 */
export const UI_CONSENT_VERSION = "2026-09";

export type ConsentAnswers = {
  /** "I have read the KVKK/GDPR notice". Required. */
  privacyNotice: boolean;
  /** Use of ideas and results by XMind Studio (KVKK explicit consent). Optional. */
  dataUse: boolean;
  /** "Share opportunities with me". Optional. */
  opportunities: boolean;
  /** Separate, explicit consent to show psychological test results to the university. */
  psychResultsShare: boolean;
};

export type CurrentConsent = { granted: boolean; version: string; at: Date };

export class ConsentRequiredError extends Error {
  readonly statusCode = 400;
  readonly code = "PRIVACY_CONSENT_REQUIRED";
  constructor() {
    super("KVKK/GDPR consent is required");
    this.name = "ConsentRequiredError";
  }
}

export async function recordConsents(
  userId: string,
  answers: ConsentAnswers,
  options: { locale: string; ip?: string | null; db?: Prisma.TransactionClient }
): Promise<void> {
  if (!answers.privacyNotice) throw new ConsentRequiredError();
  const db = options.db ?? prisma;
  const notices = noticeSetVersion(options.locale);
  const rows: Record<ConsentType, { granted: boolean; version: string }> = {
    PRIVACY_NOTICE: { granted: answers.privacyNotice, version: notices },
    DATA_USE: { granted: answers.dataUse, version: notices },
    OPPORTUNITIES: { granted: answers.opportunities, version: UI_CONSENT_VERSION },
    PSYCH_RESULTS_SHARE: { granted: answers.psychResultsShare, version: UI_CONSENT_VERSION },
  };
  await db.userConsent.createMany({
    data: CONSENT_TYPES.map((type) => ({ userId, type, ...rows[type], ip: options.ip ?? null })),
  });
}

export async function getCurrentConsents(
  userId: string,
  db: Prisma.TransactionClient = prisma
): Promise<Record<ConsentType, CurrentConsent | null>> {
  const rows = await db.userConsent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { type: true, granted: true, version: true, createdAt: true },
  });
  const current = Object.fromEntries(CONSENT_TYPES.map((t) => [t, null])) as Record<
    ConsentType,
    CurrentConsent | null
  >;
  for (const row of rows) {
    const type = row.type as ConsentType;
    if (type in current && !current[type]) {
      current[type] = { granted: row.granted, version: row.version, at: row.createdAt };
    }
  }
  return current;
}

/** True when the student must (re)answer: notice not accepted, or its text changed. */
export function needsConsent(current: Record<ConsentType, CurrentConsent | null>): boolean {
  const notice = current.PRIVACY_NOTICE;
  return !notice || !notice.granted || !isNoticeSetCurrent(notice.version);
}

/**
 * The university may see psychological results only with this separate
 * consent. Without it, it sees completion status only.
 */
export async function canUniversitySeePsychResults(
  userId: string,
  db: Prisma.TransactionClient = prisma
): Promise<boolean> {
  const latest = await db.userConsent.findFirst({
    where: { userId, type: "PSYCH_RESULTS_SHARE" },
    orderBy: { createdAt: "desc" },
    select: { granted: true },
  });
  return latest?.granted === true;
}
