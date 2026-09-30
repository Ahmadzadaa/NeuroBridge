import { setRequestLocale } from "next-intl/server";
import { localizedText } from "@/lib/i18n-content";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { SimulationGradingClient } from "./grading-client";

export default async function TenantSimulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  await requireFeature(session.user.tenantId, "simulations");

  const runs = session.user.tenantId
    ? await prisma.simulationRun.findMany({
        where: {
          user: { tenantId: session.user.tenantId },
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
        take: 100,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          simulation: {
            select: { nameTr: true, nameEn: true, nameAz: true },
          },
          decisions: {
            orderBy: { createdAt: "asc" },
            include: {
              round: { select: { order: true, title: true } },
              choice: { select: { label: true } },
            },
          },
        },
      })
    : [];

  return (
    <SimulationGradingClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      canGrade={session.user.role === "TENANT_ADMIN"}
      runs={runs.map((run) => ({
        id: run.id,
        studentName:
          [run.user.firstName, run.user.lastName].filter(Boolean).join(" ") ||
          run.user.email,
        studentEmail: run.user.email,
        simulationName: localized(run.simulation, "name", locale),
        score: run.score ?? 0,
        cash: run.cash,
        satisfaction: run.satisfaction,
        reputation: run.reputation,
        completedAt: run.completedAt?.toISOString() ?? "",
        teacherGrade: run.teacherGrade,
        teacherMaxGrade: run.teacherMaxGrade,
        teacherComment: run.teacherComment,
        decisions: run.decisions.map((d) => ({
          round: d.round.order,
          roundTitle: localizedText(d.round.title, locale),
          choiceLabel: localizedText(d.choice.label, locale),
          cashAfter: d.cashAfter,
          satisfactionAfter: d.satisfactionAfter,
          reputationAfter: d.reputationAfter,
        })),
      }))}
    />
  );
}
