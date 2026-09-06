import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards the one property that matters most here: every read the analytics
 * service issues is bound to the calling tenant.
 *
 * Trainings, lessons and exams carry no `tenantId`, and `LessonProgress` /
 * `ExamAttempt` are keyed only by `userId` — so there is no column a query
 * could be filtered on out of habit. A query written without its relation
 * filter would silently return the whole platform's rows and still look
 * correct in a single-tenant development database.
 *
 * The mock returns realistic rows so that *every* branch runs: an empty
 * fixture would skip the progress and attempt queries entirely and the test
 * would pass without ever inspecting them.
 */

const TENANT = "tenant-under-test";
const KEY = "finance_training";

const captured = new Map<string, unknown>();

function capture<T>(model: string, result: T) {
  return (args?: { where?: unknown }) => {
    captured.set(model, args?.where);
    return result as never;
  };
}

const now = new Date("2026-09-01T12:00:00.000Z");

const prismaMock = {
  program: {
    findMany: vi.fn(
      capture("program", [
        { id: "p1", programTrainings: [{ trainingType: KEY }] },
      ]),
    ),
  },
  training: {
    findMany: vi.fn(
      capture("training", [
        {
          id: "t1",
          key: KEY,
          titleAz: "Maliyyə",
          titleEn: "Finance",
          titleTr: "Finans",
          lessons: [{ id: "l1", estimatedMinutes: 10 }],
          exams: [{ id: "e1" }],
        },
      ]),
    ),
  },
  user: { count: vi.fn(capture("user", 1)) },
  participant: {
    findMany: vi.fn(
      capture("participant", [
        { userId: "u1", programId: "p1", status: "ACTIVE", registrationDate: now },
      ]),
    ),
  },
  certificate: { count: vi.fn(capture("certificate", 1)) },
  lessonProgress: {
    findMany: vi.fn(
      capture("lessonProgress", [
        { userId: "u1", lessonId: "l1", completedAt: now },
      ]),
    ),
  },
  examAttempt: {
    findMany: vi.fn(
      capture("examAttempt", [{ userId: "u1", examId: "e1", score: 80 }]),
    ),
  },
  auditLog: {
    findMany: vi.fn(capture("auditLogFindMany", [{ userId: "u1", createdAt: now }])),
    groupBy: vi.fn(capture("auditLogGroupBy", [{ userId: "u1" }])),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { getAnalyticsOverview } = await import("@/lib/analytics/overview-service");

beforeEach(() => {
  captured.clear();
  vi.clearAllMocks();
});

describe("analytics tenant isolation", () => {
  it("binds each query to the tenant through the relation that carries it", async () => {
    const result = await getAnalyticsOverview({ tenantId: TENANT }, "az", now);

    // Sanity: the fixture really did drive every branch.
    expect(result.courses).toHaveLength(1);
    expect(result.kpis.totalStudents).toBe(1);

    // Rows with their own tenant column.
    expect(captured.get("program")).toMatchObject({ tenantId: TENANT });
    expect(captured.get("user")).toMatchObject({ tenantId: TENANT });
    expect(captured.get("certificate")).toMatchObject({ tenantId: TENANT });
    expect(captured.get("auditLogFindMany")).toMatchObject({ tenantId: TENANT });
    expect(captured.get("auditLogGroupBy")).toMatchObject({ tenantId: TENANT });

    // Rows that hang off a programme.
    expect(captured.get("participant")).toMatchObject({
      program: { tenantId: TENANT },
    });

    // Rows that hang off a user — the ones with no tenant column of their own.
    expect(captured.get("lessonProgress")).toMatchObject({
      user: { tenantId: TENANT },
    });
    expect(captured.get("examAttempt")).toMatchObject({
      user: { tenantId: TENANT },
    });
  });

  it("reaches trainings only through keys derived from this tenant's programmes", async () => {
    await getAnalyticsOverview({ tenantId: TENANT }, "az", now);

    // Training has no tenantId to filter on. Its anchor is the key set, which
    // came from the tenant-scoped programme query above — so the query must
    // never be broader than that set.
    expect(captured.get("training")).toMatchObject({ key: { in: [KEY] } });
  });

  it("does not widen any query when a course filter is supplied", async () => {
    await getAnalyticsOverview(
      { tenantId: TENANT, courseId: "course-from-another-tenant" },
      "az",
      now,
    );

    // The course id narrows on top of the tenant's key set; it can never
    // replace it, so an id belonging to someone else simply matches nothing.
    expect(captured.get("training")).toMatchObject({
      key: { in: [KEY] },
      id: "course-from-another-tenant",
    });
    expect(captured.get("lessonProgress")).toMatchObject({
      user: { tenantId: TENANT },
    });
  });

  it("keeps the programme filter subordinate to the tenant", async () => {
    await getAnalyticsOverview(
      { tenantId: TENANT, programId: "program-from-another-tenant" },
      "az",
      now,
    );

    expect(captured.get("program")).toMatchObject({
      tenantId: TENANT,
      id: "program-from-another-tenant",
    });
    expect(captured.get("participant")).toMatchObject({
      program: { tenantId: TENANT, id: "program-from-another-tenant" },
    });
    expect(captured.get("certificate")).toMatchObject({
      tenantId: TENANT,
      programId: "program-from-another-tenant",
    });
  });

  it("issues no query without a where clause", async () => {
    await getAnalyticsOverview({ tenantId: TENANT }, "az", now);

    for (const [model, where] of captured) {
      expect(where, `${model} ran without a where clause`).toBeDefined();
    }
  });
});
