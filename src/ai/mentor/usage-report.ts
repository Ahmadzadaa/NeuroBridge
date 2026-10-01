import type { Prisma } from "@prisma/client";
import { localized } from "@/lib/i18n-content";
import { startOfUtcMonth } from "@/ai/mentor/limits";
import type { ReportTable, Translate, UniversityReport, ValueKind } from "@/lib/reports/university-types";

type Tx = Prisma.TransactionClient;

const SECURITY_TYPES = [
  "OFF_TOPIC",
  "INJECTION_SUSPECTED",
  "CANARY_TRIGGERED",
  "OUTPUT_REDACTED",
  "LIMIT_EXCEEDED",
  "TEMPORARY_BLOCK",
  "TENANT_BUDGET_EXHAUSTED",
  "PROVIDER_ERROR",
] as const;

const DAY_MS = 86_400_000;
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/**
 * "AI Mentor usage" for one tenant, or, with tenantId null (super admin only),
 * for the whole platform broken down by tenant.
 *
 * Built from the usage log and security events alone, which hold hashed user
 * ids and no content: an organisation's staff can see how the mentor is used
 * without any access to what participants wrote. A participant message is a
 * topic-check call, or a request the local screen stopped before that call.
 * Every query carries the tenant filter when one is given.
 */
export async function buildAiUsageReport(
  tx: Tx,
  params: { tenantId: string | null; t: Translate; locale: string; scope: string; now?: Date }
): Promise<UniversityReport> {
  const { t } = params;
  const now = params.now ?? new Date();
  const monthStart = startOfUtcMonth(now);
  const since30 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * DAY_MS);
  const from = monthStart < since30 ? monthStart : since30;
  const tenant = params.tenantId ? { tenantId: params.tenantId } : {};

  const [usage, events] = await Promise.all([
    tx.aiUsageLog.findMany({
      where: { ...tenant, createdAt: { gte: from } },
      select: {
        tenantId: true,
        userHash: true,
        simulationId: true,
        purpose: true,
        createdAt: true,
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
        costUsd: true,
      },
    }),
    tx.aiSecurityEvent.findMany({
      where: { ...tenant, createdAt: { gte: from } },
      select: { tenantId: true, userHash: true, simulationId: true, type: true, reason: true, createdAt: true },
    }),
  ]);

  // One row per participant message.
  const requests = [
    ...usage.filter((u) => u.purpose === "topic_check"),
    ...events.filter((e) => e.type === "INJECTION_SUSPECTED" && e.reason === "local_screen"),
  ].map((r) => ({ tenantId: r.tenantId, userHash: r.userHash ?? "", simulationId: r.simulationId, createdAt: r.createdAt }));

  const inMonth = <T extends { createdAt: Date }>(rows: T[]) => rows.filter((r) => r.createdAt >= monthStart);
  const tokensOf = (u: (typeof usage)[number]) => u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens;
  const users = (rows: { userHash: string | null }[]) => new Set(rows.map((r) => r.userHash)).size;
  const limitUsers = (rows: typeof events) => users(rows.filter((e) => e.type === "LIMIT_EXCEEDED"));
  const mRequests = inMonth(requests);
  const mUsage = inMonth(usage);
  const mEvents = inMonth(events);

  const col = (key: string, kind: ValueKind = "number") => ({ key, label: t(`col.${key}`), kind });
  const tables: ReportTable[] = [];

  if (!params.tenantId) {
    const tenantIds = [...new Set([...mRequests, ...mUsage].map((r) => r.tenantId).filter((x): x is string => Boolean(x)))];
    const tenants = tenantIds.length ? await tx.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }) : [];
    tables.push({
      id: "aiByTenant",
      title: t("tables.aiByTenant"),
      columns: [col("tenant", "text"), col("messages"), col("activeUsers"), col("tokens"), col("costUsd", "usd"), col("limitUsers")],
      rows: tenantIds
        .map((id) => {
          const reqs = mRequests.filter((r) => r.tenantId === id);
          const use = mUsage.filter((u) => u.tenantId === id);
          return {
            tenant: tenants.find((x) => x.id === id)?.name ?? "—",
            messages: reqs.length,
            activeUsers: users(reqs),
            tokens: use.reduce((n, u) => n + tokensOf(u), 0),
            costUsd: round4(use.reduce((n, u) => n + u.costUsd, 0)),
            limitUsers: limitUsers(mEvents.filter((e) => e.tenantId === id)),
          };
        })
        .sort((a, b) => b.costUsd - a.costUsd),
    });
  }

  const days = Array.from({ length: 30 }, (_, i) => dayOf(new Date(since30.getTime() + i * DAY_MS))).reverse();
  tables.push({
    id: "aiByDay",
    title: t("tables.aiByDay"),
    columns: [col("date", "date"), col("messages"), col("activeUsers"), col("tokens"), col("costUsd", "usd")],
    rows: days.map((day) => {
      const reqs = requests.filter((r) => dayOf(r.createdAt) === day);
      const use = usage.filter((u) => dayOf(u.createdAt) === day);
      return {
        date: day,
        messages: reqs.length,
        activeUsers: users(reqs),
        tokens: use.reduce((n, u) => n + tokensOf(u), 0),
        costUsd: round4(use.reduce((n, u) => n + u.costUsd, 0)),
      };
    }),
  });

  const simIds = [...new Set(mRequests.map((r) => r.simulationId).filter((x): x is string => Boolean(x)))];
  const sims = simIds.length
    ? await tx.simulation.findMany({ where: { id: { in: simIds } }, select: { id: true, nameAz: true, nameEn: true, nameTr: true } })
    : [];
  tables.push(
    {
      id: "aiBySimulation",
      title: t("tables.aiBySimulation"),
      columns: [col("simulation", "text"), col("messages"), col("activeUsers")],
      rows: simIds
        .map((id) => {
          const reqs = mRequests.filter((r) => r.simulationId === id);
          const sim = sims.find((s) => s.id === id);
          return { simulation: sim ? localized(sim, "name", params.locale) : "—", messages: reqs.length, activeUsers: users(reqs) };
        })
        .sort((a, b) => b.messages - a.messages),
    },
    {
      id: "aiSecurity",
      title: t("tables.aiSecurity"),
      columns: [col("eventType", "text"), col("count")],
      rows: SECURITY_TYPES.map((type) => ({ eventType: t(`aiEvent.${type}`), count: mEvents.filter((e) => e.type === type).length })),
    }
  );

  return {
    type: "aiMentor",
    title: t("types.aiMentor.title"),
    description: t("types.aiMentor.description"),
    scope: params.scope,
    kpis: [
      { key: "aiMessages", label: t("kpi.aiMessages"), value: mRequests.length, kind: "number" },
      { key: "aiActiveUsers", label: t("kpi.aiActiveUsers"), value: users(mRequests), kind: "number" },
      { key: "aiTokens", label: t("kpi.aiTokens"), value: mUsage.reduce((n, u) => n + tokensOf(u), 0), kind: "number" },
      { key: "aiCost", label: t("kpi.aiCost"), value: round4(mUsage.reduce((n, u) => n + u.costUsd, 0)), kind: "usd" },
      { key: "aiLimitUsers", label: t("kpi.aiLimitUsers"), value: limitUsers(mEvents), kind: "number" },
      {
        key: "aiRejected",
        label: t("kpi.aiRejected"),
        value: mEvents.filter((e) => e.type === "OFF_TOPIC" || e.type === "INJECTION_SUSPECTED").length,
        kind: "number",
      },
    ],
    bars: [],
    tables,
    notes: [t("notes.aiMentor")],
  };
}
