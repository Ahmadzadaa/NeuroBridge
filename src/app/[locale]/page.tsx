import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth, getRoleDashboardPath } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Sparkles } from "lucide-react";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user) {
    redirect(getRoleDashboardPath(session.user.role, locale));
  }

  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F6FA] dark:bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-xl dark:bg-card/60">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>{tc("appDescription")}</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t("hero")}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="rounded-2xl px-8 text-base shadow-lg hover:shadow-xl transition-all">
              {t("getStarted")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { emoji: "🎯", title: "Simulations", desc: "4 core simulation tracks" },
            { emoji: "🏆", title: "Gamification", desc: "Coins, badges & certificates" },
            { emoji: "🤖", title: "AI Tools", desc: "Mentor, Jury & Pitch Coach" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-md dark:bg-card/70"
            >
              <div className="text-3xl">{item.emoji}</div>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
