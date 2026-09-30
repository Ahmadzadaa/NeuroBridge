import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-md sm:p-10">
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        {state === "VALID" ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
            <ActivateForm token={token} />
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">{t(`state.${state}`)}</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
              {t("goToLogin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
