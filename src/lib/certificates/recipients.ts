import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPostgresDatabase } from "@/lib/db/tenant-context";

export const RECIPIENT_PAGE = 50;
/** Rosters up to this size go to the browser whole, so its accent-folding search sees everyone. */
export const FULL_ROSTER_LIMIT = 2000;

export type Recipient = { id: string; name: string; email: string };

/**
 * Participants of a tenant matching every word of the query in their first
 * name, last name or email. Searching on the server keeps large universities
 * fully reachable instead of shipping a capped roster to the browser.
 */
export async function searchRecipients(
  tenantId: string,
  query: string,
  take = RECIPIENT_PAGE
): Promise<{ total: number; results: Recipient[] }> {
  // SQLite's LIKE is already case-insensitive for ASCII; Postgres needs the mode.
  const mode = isPostgresDatabase() ? { mode: "insensitive" as const } : {};
  const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  const base: Prisma.UserWhereInput = { tenantId, role: "PARTICIPANT" };
  const where: Prisma.UserWhereInput = terms.length
    ? {
        ...base,
        AND: terms.map((term) => ({
          OR: [{ firstName: { contains: term, ...mode } }, { lastName: { contains: term, ...mode } }, { email: { contains: term, ...mode } }],
        })),
      }
    : base;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take,
    }),
  ]);
  return {
    total,
    results: users.map((u) => ({ id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email, email: u.email })),
  };
}

/** The page's starting roster: everyone when it is small enough, else the first page plus server search. */
export async function loadRecipients(tenantId: string) {
  const { total, results } = await searchRecipients(tenantId, "", FULL_ROSTER_LIMIT);
  const complete = total <= FULL_ROSTER_LIMIT;
  return { total, complete, results: complete ? results : results.slice(0, RECIPIENT_PAGE) };
}
