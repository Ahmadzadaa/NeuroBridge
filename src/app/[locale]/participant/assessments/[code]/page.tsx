import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { redirect } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  AssessmentError,
  getAssessmentForm,
  listStudentAssessments,
} from "@/lib/assessments/assessment-service";
import { AssessmentForm } from "./assessment-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  const form = await getAssessmentForm(code, locale).catch(() => null);
  return { title: `${form?.title ?? code} · BizSim` };
}

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("assessments");

  const status = await listStudentAssessments(session.user.id, locale);
  const entry = status?.assessments.find((a) => a.code === code);
  if (!status || !entry) notFound();
  if (entry.completedAt) redirect({ href: "/participant/assessments", locale });

  const form = await getAssessmentForm(code, locale).catch((error) => {
    if (error instanceof AssessmentError) notFound();
    throw error;
  });

  return (
    <DashboardLayout panel="participant" title={form.title} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-3xl space-y-4">
        {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
        {form.isDemo && (
          <p role="note" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            {t("demoNotice")}
          </p>
        )}
        <AssessmentForm code={form.code} scaleMin={form.scaleMin} scaleMax={form.scaleMax} questions={form.questions} />
      </div>
    </DashboardLayout>
  );
}
