import { getTranslations, setRequestLocale } from "next-intl/server";
import { KeyRound, LinkIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthShell, Sheet } from "@/components/layout/auth-shell";
import { IconTile } from "@/components/ui/ios";
import { buttonVariants } from "@/components/ui/button";
import { getActivationTokenState } from "@/lib/onboarding/activation-token";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("activation");
  const state = await getActivationTokenState(token);
  const valid = state === "VALID";

  return (
    <AuthShell width="sm">
      <Sheet>
        <div className="flex flex-col items-center text-center">
          <IconTile icon={valid ? KeyRound : LinkIcon} tone={valid ? "indigo" : "slate"} size="lg" />
          <h1 className="mt-4 text-[26px] font-bold tracking-[-0.6px] text-foreground">{t("title")}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {valid ? t("subtitle") : t(`state.${state}`)}
          </p>
        </div>
        {valid ? (
          <ActivateForm token={token} />
        ) : (
          <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-7 w-full" })}>
            {t("goToLogin")}
          </Link>
        )}
      </Sheet>
    </AuthShell>
  );
}
