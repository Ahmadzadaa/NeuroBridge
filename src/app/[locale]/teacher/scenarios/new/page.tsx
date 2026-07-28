import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { ScenarioEditor, emptyScenario } from "../scenario-editor";

export default async function NewScenarioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TEACHER"]);
  await requireFeature(session.user.tenantId, "teachers");

  return (
    <ScenarioEditor
      locale={locale}
      userName={session.user.name ?? "Teacher"}
      scenarioId={null}
      initial={emptyScenario()}
      hasRuns={false}
    />
  );
}
