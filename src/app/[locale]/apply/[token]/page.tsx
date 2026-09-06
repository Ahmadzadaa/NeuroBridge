"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface ApplyProgram {
  name: string;
  description: string | null;
  tenantName: string;
  canRegister: boolean;
  registrationOpen: boolean;
  seatsAvailable: boolean;
  programCapacityAvailable: boolean;
}

export default function ApplyPage() {
  const params = useParams<{ token: string; locale: string }>();
  const router = useRouter();
  const t = useTranslations("apply");
  const [program, setProgram] = useState<ApplyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProgram() {
      try {
        const res = await fetch(`/api/apply/${params.token}`);
        if (cancelled) return;
        if (!res.ok) {
          setProgram(null);
          return;
        }
        setProgram(await res.json());
      } catch {
        // A dead network here is not the same as a bad token, and telling the
        // applicant their invitation is invalid would send them to the wrong
        // person for help.
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProgram();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          // The account and the welcome email are created from this, so the
          // applicant lands in the language they applied in.
          locale: params.locale,
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(
          data.code === "SEAT_LIMIT_REACHED"
            ? t("seatLimitToast")
            : t("failedToast"),
        );
        return;
      }

      toast.success(t("successToast"));
      router.push(`/${params.locale}/login`);
    } catch {
      toast.error(t("failedToast"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{loadError ? t("loadFailed") : t("notFound")}</CardTitle>
            {!loadError && (
              <CardDescription>{t("notFoundHint")}</CardDescription>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-background">
      <Card className="w-full max-w-lg rounded-2xl border-0 shadow-xl">
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <CardDescription>{program.tenantName}</CardDescription>
          {program.description && (
            <p className="text-sm text-muted-foreground">
              {program.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!program.canRegister ? (
            <p className="text-sm text-destructive">
              {!program.registrationOpen && t("registrationClosed")}
              {program.registrationOpen &&
                !program.seatsAvailable &&
                t("seatLimitReached")}
              {program.registrationOpen &&
                program.seatsAvailable &&
                !program.programCapacityAvailable &&
                t("capacityReached")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("firstName")}</Label>
                  <Input
                    id="firstName"
                    required
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("lastName")}</Label>
                  <Input
                    id="lastName"
                    required
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="password-hint"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <p id="password-hint" className="text-xs text-muted-foreground">
                  {t("passwordHint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={submitting}
              >
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
