import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ user: { count: vi.fn(), findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { FULL_ROSTER_LIMIT, loadRecipients, searchRecipients } from "@/lib/certificates/recipients";

const people = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i}`, firstName: "Ad", lastName: String(i), email: `u${i}@x.az` }));

describe("certificate recipients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches every word against name or email, inside the caller's organisation", async () => {
    db.user.count.mockResolvedValue(1);
    db.user.findMany.mockResolvedValue([{ id: "u1", firstName: "Aysel", lastName: "Quliyeva", email: "a@x.az" }]);

    const { results } = await searchRecipients("t1", "  Aysel  Quli ");
    const where = db.user.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe("t1");
    expect(where.role).toBe("PARTICIPANT");
    expect(where.AND).toHaveLength(2);
    expect(where.AND[1].OR[1].lastName.contains).toBe("Quli");
    expect(results).toEqual([{ id: "u1", name: "Aysel Quliyeva", email: "a@x.az" }]);
  });

  it("sends a small roster whole and a large one as a first page", async () => {
    db.user.count.mockResolvedValue(3);
    db.user.findMany.mockResolvedValue(people(3));
    expect(await loadRecipients("t1")).toMatchObject({ total: 3, complete: true });

    db.user.count.mockResolvedValue(FULL_ROSTER_LIMIT + 1);
    db.user.findMany.mockResolvedValue(people(FULL_ROSTER_LIMIT));
    const large = await loadRecipients("t1");
    expect(large.complete).toBe(false);
    expect(large.total).toBe(FULL_ROSTER_LIMIT + 1);
    expect(large.results).toHaveLength(50);
  });
});
