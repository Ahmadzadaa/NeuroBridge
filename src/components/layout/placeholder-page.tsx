import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";

type PanelType = "super-admin" | "tenant" | "participant";

interface PlaceholderPageProps {
  panel: PanelType;
  title: string;
  userName: string;
  description: string;
}

/** A section that is planned but not built yet. */
export async function PlaceholderPage({ panel, title, userName, description }: PlaceholderPageProps) {
  const t = await getTranslations("common");
  return (
    <DashboardLayout panel={panel} title={title} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6">
        <LargeTitle title={title} />
        <div className="ios-reveal flex flex-col items-center rounded-[22px] bg-card px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[17px] font-semibold text-foreground">{t("comingSoon")}</p>
          <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
