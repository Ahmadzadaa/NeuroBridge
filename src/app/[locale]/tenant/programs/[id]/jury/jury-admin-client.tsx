"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Crown,
  Mail,
  Plus,
  Scale,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, IconTile, InsetGroup, LargeTitle, Reveal } from "@/components/ui/ios";
import { avatarTone } from "@/components/ui/avatar-tone";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";

type RankingRow = { userId: string; name: string; email: string; university: string | null; points: number; rank: number; selected: boolean };
type Juror = { id: string; name: string; email: string; headline: string | null; hasAvatar: boolean; profileComplete: boolean };
type Criterion = { id: string; label: string; nameAz: string; nameEn: string; nameTr: string; maxScore: number; weight: number };
type Result = {
  finalistId: string;
  name: string;
  university: string | null;
  platformRank: number;
  total: number | null;
  rank: number | null;
  averages: Record<string, number | null>;
  submitted: number;
};

export interface JuryAdminClientProps {
  programId: string;
  programName: string;
  canManage: boolean;
  juryEnabled: boolean;
  finalistCount: number | null;
  confirmedAt: string | null;
  juryDay: { id: string; date: string } | null;
  ranking: RankingRow[];
  jurors: Juror[];
  criteria: Criterion[];
  scoringStarted: boolean;
  results: Result[];
}

const SURFACE =
  "rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60";

function Avatar({ id, name, hasAvatar, size = 40 }: { id: string; name: string; hasAvatar: boolean; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return hasAvatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/profile/avatar/${id}`} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-semibold uppercase text-white", avatarTone(id))}
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

export function JuryAdminClient(props: JuryAdminClientProps) {
  const t = useTranslations("tenant.jury");
  const tc = useTranslations("common");
  const locale = useLocale();
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const [finalistCount, setFinalistCount] = useState(props.finalistCount ?? 10);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const confirmed = props.ranking.filter((r) => r.selected).map((r) => r.userId);
    // Before the first confirmation, propose the top of the platform ranking.
    return new Set(confirmed.length ? confirmed : props.ranking.slice(0, props.finalistCount ?? 10).map((r) => r.userId));
  });
  const [juror, setJuror] = useState({ firstName: "", lastName: "", email: "" });
  const [criteria, setCriteria] = useState(props.criteria);
  const [juryDate, setJuryDate] = useState(props.juryDay?.date ?? "");

  const dateFmt = { format: (value: Date | string) => formatDate(value, locale, "long") };

  async function call(key: string, url: string, method: string, body: unknown, success?: string) {
    setBusy(key);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(apiError(data));
        return null;
      }
      if (success) toast.success(success);
      router.refresh();
      return data;
    } catch {
      toast.error(tc("error"));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const base = `/api/programs/${props.programId}`;
  const disabled = !props.canManage;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/tenant/programs" className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <LargeTitle eyebrow={t("title")} title={props.programName} subtitle={t("subtitle")} />
      </div>

      {/* Settings */}
      <Reveal index={1}>
        <InsetGroup header={t("settings")} footer={t("settingsFooter")}>
          <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
            <IconTile icon={Scale} tone="violet" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{t("enable")}</p>
              <p className="text-[13px] text-muted-foreground">{t("enableHint")}</p>
            </div>
            <Switch
              checked={props.juryEnabled}
              disabled={disabled || busy === "toggle"}
              aria-label={t("enable")}
              onCheckedChange={(checked) => call("toggle", `${base}/jury`, "PATCH", { juryEnabled: checked })}
            />
          </div>
          {props.juryEnabled && (
            <>
              <div className="flex min-h-[60px] flex-wrap items-center gap-3 px-4 py-3">
                <IconTile icon={Crown} tone="amber" size="sm" />
                <p className="min-w-0 flex-1 text-[15px] font-medium">{t("finalistCount")}</p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={finalistCount}
                  disabled={disabled}
                  onChange={(e) => setFinalistCount(Number(e.target.value))}
                  className="h-10 w-24 text-center"
                  aria-label={t("finalistCount")}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || busy === "count" || finalistCount === props.finalistCount}
                  onClick={() => call("count", `${base}/jury`, "PATCH", { finalistCount }, t("saved"))}
                >
                  {tc("save")}
                </Button>
              </div>
              {props.juryDay && (
                <div className="flex min-h-[60px] flex-wrap items-center gap-3 px-4 py-3">
                  <IconTile icon={CalendarDays} tone="sky" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{t("juryDate")}</p>
                    <p className="text-[13px] text-muted-foreground">{t("juryDateHint")}</p>
                  </div>
                  <Input
                    type="date"
                    value={juryDate}
                    disabled={disabled}
                    onChange={(e) => setJuryDate(e.target.value)}
                    className="h-10 w-44"
                    aria-label={t("juryDate")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled || busy === "date" || juryDate === props.juryDay.date}
                    onClick={() => call("date", `${base}/schedule/${props.juryDay!.id}`, "PATCH", { date: juryDate }, t("saved"))}
                  >
                    {tc("save")}
                  </Button>
                </div>
              )}
            </>
          )}
        </InsetGroup>
      </Reveal>

      {props.juryEnabled && (
        <>
          {/* Finalists */}
          <Reveal index={2} as="section">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-[20px] font-bold tracking-[-0.4px]">{t("finalists")}</h2>
                <p className="text-[13px] text-muted-foreground">
                  {props.confirmedAt
                    ? t("confirmedOn", { date: dateFmt.format(new Date(props.confirmedAt)) })
                    : t("finalistsHint", { count: props.finalistCount ?? 10 })}
                </p>
              </div>
              <Button
                disabled={disabled || busy === "finalists" || selected.size === 0}
                onClick={() => call("finalists", `${base}/finalists`, "PUT", { userIds: [...selected] }, t("finalistsConfirmed"))}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("confirmFinalists", { count: selected.size })}
              </Button>
            </div>
            <div className={cn(SURFACE, "overflow-hidden")}>
              {props.ranking.length === 0 ? (
                <p className="px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noParticipants")}</p>
              ) : (
                <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto">
                  {props.ranking.map((r) => {
                    const on = selected.has(r.userId);
                    return (
                      <li key={r.userId}>
                        <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40", on && "bg-primary/5")}>
                          <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                            aria-label={r.name}
                            checked={on}
                            disabled={disabled}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(r.userId)) next.delete(r.userId);
                                else next.add(r.userId);
                                return next;
                              })
                            }
                          />
                          <span className="w-8 shrink-0 text-center text-[13px] font-bold tabular-nums text-muted-foreground">#{r.rank}</span>
                          <Avatar id={r.userId} name={r.name} hasAvatar={false} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{r.name}</span>
                            <span className="block truncate text-[12px] text-muted-foreground">{r.university ?? r.email}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[15px] font-bold tabular-nums">{r.points}</span>
                            <span className="block text-[11px] text-muted-foreground">{t("points")}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Reveal>

          {/* Jurors */}
          <Reveal index={3} as="section">
            <h2 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.4px]">{t("jurors")}</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className={cn(SURFACE, "overflow-hidden")}>
                {props.jurors.length === 0 ? (
                  <p className="px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noJurors")}</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {props.jurors.map((j) => (
                      <li key={j.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar id={j.id} name={j.name} hasAvatar={j.hasAvatar} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{j.name}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{j.headline ?? j.email}</p>
                          {!j.profileComplete && (
                            <span className="mt-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-dark">
                              {t("profileIncomplete")}
                            </span>
                          )}
                        </div>
                        {props.canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("resend")}
                              title={t("resend")}
                              disabled={busy === `resend-${j.id}`}
                              onClick={() => call(`resend-${j.id}`, `${base}/jury/jurors`, "PATCH", { userId: j.id, locale }, t("resent"))}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("remove")}
                              title={t("remove")}
                              className="text-destructive hover:bg-destructive/10"
                              disabled={busy === `remove-${j.id}`}
                              onClick={() => call(`remove-${j.id}`, `${base}/jury/jurors`, "DELETE", { userId: j.id }, t("removed"))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {props.canManage && (
                <form
                  className={cn(SURFACE, "space-y-3 p-5")}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const data = await call("add", `${base}/jury/jurors`, "POST", { ...juror, locale });
                    if (data) {
                      toast.success(data.created ? (data.emailed ? t("invited", { email: juror.email }) : t("inviteNotSent")) : t("added"));
                      setJuror({ firstName: "", lastName: "", email: "" });
                    }
                  }}
                >
                  <p className="flex items-center gap-2 text-[15px] font-semibold">
                    <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("addJuror")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("firstName")} htmlFor="juror-first">
                      <Input id="juror-first" required maxLength={100} value={juror.firstName} onChange={(e) => setJuror({ ...juror, firstName: e.target.value })} />
                    </Field>
                    <Field label={t("lastName")} htmlFor="juror-last">
                      <Input id="juror-last" required maxLength={100} value={juror.lastName} onChange={(e) => setJuror({ ...juror, lastName: e.target.value })} />
                    </Field>
                  </div>
                  <Field label={t("email")} htmlFor="juror-email" hint={t("addHint")}>
                    <Input id="juror-email" type="email" required value={juror.email} onChange={(e) => setJuror({ ...juror, email: e.target.value })} />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy === "add"}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t("addJuror")}
                  </Button>
                </form>
              )}
            </div>
          </Reveal>

          {/* Criteria */}
          <Reveal index={4} as="section">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-[20px] font-bold tracking-[-0.4px]">{t("criteria")}</h2>
                <p className="text-[13px] text-muted-foreground">{props.scoringStarted ? t("criteriaLocked") : t("criteriaHint")}</p>
              </div>
              {props.canManage && (
                <div className="flex gap-2">
                  {!props.scoringStarted && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={criteria.length >= 12}
                      onClick={() =>
                        setCriteria([...criteria, { id: `new-${criteria.length}`, label: "", nameAz: "", nameEn: "", nameTr: "", maxScore: 10, weight: 1 }])
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {t("addCriterion")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={busy === "criteria"}
                    onClick={() =>
                      call(
                        "criteria",
                        `${base}/jury/criteria`,
                        "PUT",
                        {
                          criteria: criteria.map(({ id, nameAz, nameEn, nameTr, maxScore, weight }) => ({
                            id: id.startsWith("new-") ? undefined : id,
                            nameAz,
                            nameEn,
                            nameTr,
                            maxScore,
                            weight,
                          })),
                        },
                        t("saved")
                      )
                    }
                  >
                    {tc("save")}
                  </Button>
                </div>
              )}
            </div>
            <ol className="space-y-3">
              {criteria.map((c, i) => {
                const update = (patch: Partial<Criterion>) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <li key={c.id} className={cn(SURFACE, "p-4")}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">{i + 1}</span>
                      {props.canManage && !props.scoringStarted && criteria.length > 1 && (
                        <Button variant="ghost" size="icon" aria-label={t("removeCriterion")} onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(["nameAz", "nameEn", "nameTr"] as const).map((key) => (
                        <Field key={key} label={t(`name.${key}`)} htmlFor={`${c.id}-${key}`}>
                          <Input id={`${c.id}-${key}`} value={c[key]} maxLength={120} disabled={disabled} onChange={(e) => update({ [key]: e.target.value })} />
                        </Field>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:w-1/2">
                      <Field label={t("maxScore")} htmlFor={`${c.id}-max`}>
                        <Input id={`${c.id}-max`} type="number" min={1} max={100} value={c.maxScore} disabled={disabled || props.scoringStarted} onChange={(e) => update({ maxScore: Number(e.target.value) })} />
                      </Field>
                      <Field label={t("weight")} htmlFor={`${c.id}-weight`}>
                        <Input id={`${c.id}-weight`} type="number" min={1} max={10} value={c.weight} disabled={disabled || props.scoringStarted} onChange={(e) => update({ weight: Number(e.target.value) })} />
                      </Field>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          {/* Results */}
          <Reveal index={5} as="section">
            <h2 className="mb-1 px-1 text-[20px] font-bold tracking-[-0.4px]">{t("results")}</h2>
            <p className="mb-3 px-1 text-[13px] text-muted-foreground">{t("resultsHint")}</p>
            {props.results.length === 0 ? (
              <p className={cn(SURFACE, "px-4 py-10 text-center text-[14px] text-muted-foreground")}>{t("noResults")}</p>
            ) : (
              <div className={cn(SURFACE, "overflow-x-auto")}>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                      <th scope="col" className="px-4 py-3">#</th>
                      <th scope="col" className="px-4 py-3">{t("finalist")}</th>
                      {criteria.map((c) => (
                        <th key={c.id} scope="col" className="px-3 py-3 text-right normal-case tracking-normal">{c.label || c.nameEn}</th>
                      ))}
                      <th scope="col" className="px-4 py-3 text-right">{t("total")}</th>
                      <th scope="col" className="px-4 py-3 text-right">{t("submitted")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.results.map((r) => (
                      <tr key={r.finalistId} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          {r.rank === 1 ? <Trophy className="h-4 w-4 text-amber-500" aria-label="1" /> : <span className="tabular-nums text-muted-foreground">{r.rank ?? "—"}</span>}
                        </td>
                        <th scope="row" className="min-w-[180px] px-4 py-3 font-medium">
                          {r.name}
                          <span className="block text-[12px] font-normal text-muted-foreground">{r.university ?? t("platformRank", { rank: r.platformRank })}</span>
                        </th>
                        {criteria.map((c) => (
                          <td key={c.id} className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                            {r.averages[c.id] ?? "—"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-[15px] font-bold tabular-nums">{r.total === null ? "—" : `${r.total}%`}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {r.submitted}/{props.jurors.length}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Reveal>
        </>
      )}
    </div>
  );
}
