import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { JuryProfileForm } from "./jury-profile-form";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "juryProfile" });
  return { title: `${t("title")} · BizSim` };
}

/** The juror's public profile: the organisation and the students see who is judging. */
export default async function JuryProfilePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  const t = await getTranslations("juryProfile");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, email: true, headline: true, bio: true, avatarPath: true },
  });

  return (
    <DashboardLayout panel="jury" title={t("title")} userName={session.user.name ?? ""}>
      <JuryProfileForm
        user={{
          id: user.id,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email,
          headline: user.headline ?? "",
          bio: user.bio ?? "",
          avatarUrl: user.avatarPath ? `/api/profile/avatar/${user.id}` : null,
        }}
      />
    </DashboardLayout>
  );
}
