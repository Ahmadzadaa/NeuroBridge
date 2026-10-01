import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KeyRound, LinkIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthShell, Sheet } from "@/components/layout/auth-shell";
import { IconTile } from "@/components/ui/ios";
import { buttonVariants } from "@/components/ui/button";
import { getActivationTokenState } from "@/lib/onboarding/activation-token";
import { ActivateForm } from "../../activate/[token]/activate-form";

type Params = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "passwordReset" });
  return { title: `${t("newTitle")} · BizSim`, robots: { index: false } };
}

/** Lands from the reset email; the same one-time token flow as account activation. */
export default async function ResetPasswordPage({ params }: Params) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("passwordReset");
  const tAct = await getTranslations("activation");
  const state = await getActivationTokenState(token);
  const valid = state === "VALID";

  return (
    <AuthShell width="sm">
      <Sheet>
        <div className="flex flex-col items-center text-center">
          <IconTile icon={valid ? KeyRound : LinkIcon} tone={valid ? "indigo" : "slate"} size="lg" />
          <h1 className="mt-4 text-[26px] font-bold tracking-[-0.6px] text-foreground">{t("newTitle")}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {valid ? t("newSubtitle") : t(`state.${state}`)}
          </p>
        </div>
        {valid ? (
          <ActivateForm token={token} />
        ) : (
          <Link
            href={state === "INVALID" ? "/login" : "/forgot-password"}
            className={buttonVariants({ size: "lg", className: "mt-7 w-full" })}
          >
            {state === "INVALID" ? tAct("goToLogin") : t("requestNew")}
          </Link>
        )}
      </Sheet>
    </AuthShell>
  );
}
