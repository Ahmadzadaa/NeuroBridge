"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { toast } from "sonner";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      totpCode: totpCode || undefined,
      recoveryCode: recoveryCode || undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setShow2FA(true);
      toast.error(t("invalidCredentials"));
      return;
    }

    const session = await getSession();
    const role = session?.user?.role as UserRole | undefined;

    if (session?.user?.requires2FASetup) {
      router.refresh();
      router.push("/settings/security");
      return;
    }

    const dashboardByRole: Record<UserRole, string> = {
      SUPER_ADMIN: "/super-admin",
      TENANT_ADMIN: "/tenant",
      TENANT_VIEWER: "/tenant",
      PARTICIPANT: "/participant",
    };

    router.refresh();
    router.push(role ? dashboardByRole[role] : "/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4 dark:bg-background">
      <div className="absolute right-4 top-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md rounded-2xl border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
            B
          </div>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            {(show2FA || totpCode || recoveryCode) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="totpCode">{t("totpCode")}</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="rounded-xl"
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recoveryCode">{t("recoveryCode")}</Label>
                  <Input
                    id="recoveryCode"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </>
            )}
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={loading}
            >
              {loading ? "..." : t("login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
