import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { ScenarioEditor, emptyScenario } from "../scenario-editor";

export default async function NewScenarioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TEACHER"]);

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
