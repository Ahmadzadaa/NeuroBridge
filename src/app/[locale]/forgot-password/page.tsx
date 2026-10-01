import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell, Sheet } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "./forgot-form";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "passwordReset" });
  return { title: `${t("title")} · BizSim`, robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthShell width="sm">
      <Sheet>
        <ForgotPasswordForm />
      </Sheet>
    </AuthShell>
  );
}
