import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAnalyticsOverview } from "@/lib/analytics/overview-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/**
 * The end-to-end proof for tenant isolation: two organisations working through
 * the *same* platform-level training, each with their own students, progress
 * and certificates. Tenant A's dashboard must show only A.
 *
 * The unit test next to this one asserts the query filters; this one asserts
 * the numbers, which is what an auditor would actually ask to see.
 */
describe.skipIf(!hasTestDb)("analytics tenant isolation (database)", () => {
  const suffix = Date.now().toString(36);
  const trainingKey = `analytics_iso_${suffix}`;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const training = await prisma.training.create({
      data: {
        key: trainingKey,
        titleTr: "Izolasyon",
        titleEn: "Isolation",
        titleAz: "İzolyasiya",
        lessons: {
          create: [
            { title: "L1", titleTr: "L1", titleEn: "L1", titleAz: "L1", content: "-", estimatedMinutes: 10, order: 1 },
            { title: "L2", titleTr: "L2", titleEn: "L2", titleAz: "L2", content: "-", estimatedMinutes: 10, order: 2 },
          ],
        },
      },
      include: { lessons: true },
    });
    ids.trainingId = training.id;

    for (const label of ["a", "b"] as const) {
      const tenant = await prisma.tenant.create({
        data: { name: `Analytics ${label} ${suffix}`, status: "ACTIVE", seatLimit: 10, seatsUsed: 0 },
      });
      ids[`tenant_${label}`] = tenant.id;

      const program = await prisma.program.create({
        data: {
          tenantId: tenant.id,
          name: `Program ${label}`,
          type: "entrepreneurship_training",
          applicationStart: new Date("2026-01-01"),
          applicationEnd: new Date("2026-12-31"),
          participantLimit: 50,
          programTrainings: { create: [{ trainingType: trainingKey }] },
        },
      });
      ids[`program_${label}`] = program.id;

      // Tenant A gets two students, tenant B gets one — so any leak shows up
      // as a number that cannot be produced from A's own rows.
      const count = label === "a" ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: `${label}${i}.${suffix}@example.test`,
            passwordHash: "x",
            role: "PARTICIPANT",
          },
        });

        await prisma.participant.create({
          data: { programId: program.id, userId: user.id, status: "ACTIVE" },
        });

        // Everyone finishes both lessons, so completion is 100% on both sides
        // and a leak changes the *counts*, not the percentage.
        for (const lesson of training.lessons) {
          await prisma.lessonProgress.create({
            data: { lessonId: lesson.id, userId: user.id },
          });
        }

        await prisma.auditLog.create({
          data: { tenantId: tenant.id, userId: user.id, action: AUDIT_ACTIONS.LOGIN_SUCCESS },
        });

        await prisma.certificate.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            programId: program.id,
            type: "PARTICIPATION",
            serialNumber: `ISO-${label}-${i}-${suffix}`,
            verifyCode: `VC${label}${i}${suffix}`.slice(0, 20),
            recipientName: "Test",
            title: "Test",
          },
        });
      }
    }
  });

  afterAll(async () => {
    if (!hasTestDb) return;
    for (const label of ["a", "b"] as const) {
      const tenantId = ids[`tenant_${label}`];
      if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
    if (ids.trainingId) {
      await prisma.training.delete({ where: { id: ids.trainingId } }).catch(() => {});
    }
  });

  it("counts only the calling tenant's students, enrolments and certificates", async () => {
    const a = await getAnalyticsOverview({ tenantId: ids.tenant_a });
    const b = await getAnalyticsOverview({ tenantId: ids.tenant_b });

    expect(a.kpis.totalStudents).toBe(2);
    expect(b.kpis.totalStudents).toBe(1);

    expect(a.kpis.enrolments).toBe(2);
    expect(b.kpis.enrolments).toBe(1);

    expect(a.kpis.certificatesIssued).toBe(2);
    expect(b.kpis.certificatesIssued).toBe(1);

    expect(a.kpis.activeStudents30d).toBe(2);
    expect(b.kpis.activeStudents30d).toBe(1);
  });

  it("reports the shared training separately for each tenant", async () => {
    const a = await getAnalyticsOverview({ tenantId: ids.tenant_a });
    const b = await getAnalyticsOverview({ tenantId: ids.tenant_b });

    const courseA = a.courses.find((c) => c.courseKey === trainingKey);
    const courseB = b.courses.find((c) => c.courseKey === trainingKey);

    // The same platform-level training, but each side sees only its own cohort.
    expect(courseA?.enrolled).toBe(2);
    expect(courseA?.completed).toBe(2);
    expect(courseB?.enrolled).toBe(1);
    expect(courseB?.completed).toBe(1);
  });

  it("does not leak another tenant's activity into the weekly series", async () => {
    const b = await getAnalyticsOverview({ tenantId: ids.tenant_b });

    const lessons = b.timeSeries.reduce((sum, p) => sum + p.lessonsCompleted, 0);
    // One student × two lessons. Tenant A's four completions must not appear.
    expect(lessons).toBe(2);
  });

  it("returns nothing for a tenant with no programmes", async () => {
    const empty = await prisma.tenant.create({
      data: { name: `Analytics empty ${suffix}`, status: "ACTIVE", seatLimit: 1, seatsUsed: 0 },
    });

    const result = await getAnalyticsOverview({ tenantId: empty.id });

    expect(result.courses).toEqual([]);
    expect(result.kpis.totalStudents).toBe(0);
    expect(result.kpis.averageCompletionPercent).toBe(0);
    expect(result.timeSeries).toHaveLength(12);

    await prisma.tenant.delete({ where: { id: empty.id } });
  });
});
