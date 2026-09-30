"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { OptionCard } from "@/components/tenant/option-card";
import { FormSection } from "@/components/tenant/form-section";
import { iconFor } from "@/lib/program-icons";
import { PROJECT_TYPES, SIMULATION_TYPES, AI_TOOLS } from "@/lib/constants";
import { toast } from "sonner";
import { Building2, CalendarClock, CalendarDays, CalendarRange, Check, Copy, Link2, Loader2, Sparkles } from "lucide-react";

export interface ProgramBuilderInitial {
  id: string;
  tenantName: string;
  name: string;
  description: string | null;
  type: string;
  applicationStart: string;
  applicationEnd: string;
  simulationStart: string | null;
  simulationEnd: string | null;
  programStart: string | null;
  programEnd: string | null;
  participantLimit: number;
  certificateName: string | null;
  finalistCount: number | null;
  juryEnabled: boolean;
  simulations: string[];
  trainings: string[];
  aiTools: string[];
  pendingSetup: boolean;
}

interface ProgramBuilderProps {
  userName: string;
  /** Create mode: the organisations a programme can be made for. */
  tenants?: { id: string; name: string }[];
  /** Edit mode: the programme being completed or changed. */
  initial?: ProgramBuilderInitial;
  /** Trainings as stored in the catalogue: key + display name. */
  trainingOptions: { key: string; label: string }[];
}

/** Simulations are capped by the product; the others are not. */
const MAX_SIMULATIONS = 4;

/**
 * The programme builder, used by the platform team: organisations buy
 * programmes and never build them. Creates a programme for a chosen tenant,
 * or completes one a paid order left in PENDING_SETUP.
 */
export function ProgramBuilder({ userName, tenants, initial, trainingOptions }: ProgramBuilderProps) {
  const t = useTranslations("tenant.programs");
  const tp = useTranslations("tenant.projectTypes");
  const ts = useTranslations("tenant.simulationTypes");
  const ta = useTranslations("tenant.aiTools");
  const tc = useTranslations("common");
  const tb = useTranslations("tenant.programBuilder");
  const tsa = useTranslations("superAdmin.programs");
  const router = useRouter();
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const editing = Boolean(initial);

  const [tenantId, setTenantId] = useState("");
  const [simulations, setSimulations] = useState<string[]>(initial?.simulations ?? []);
  const [trainings, setTrainings] = useState<string[]>(initial?.trainings ?? []);
  const [aiTools, setAiTools] = useState<string[]>(initial?.aiTools ?? []);
  const [projectType, setProjectType] = useState(initial && !initial.pendingSetup ? initial.type : "");
  const [applicationLink, setApplicationLink] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void, max?: number) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else if (!max || list.length < max) {
      setter([...list, item]);
    } else {
      toast.error(tb("maxReached", { count: max }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectType) {
      toast.error(tb("typeRequired"));
      return;
    }
    if (!editing && !tenantId) {
      toast.error(tsa("tenantRequired"));
      return;
    }
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      ...(editing ? {} : { tenantId }),
      name: formData.get("name"),
      description: formData.get("description"),
      type: projectType,
      applicationStart: formData.get("applicationStart"),
      applicationEnd: formData.get("applicationEnd"),
      simulationStart: formData.get("simulationStart") || null,
      simulationEnd: formData.get("simulationEnd") || null,
      participantLimit: formData.get("participantLimit"),
      programStart: formData.get("programStart"),
      programEnd: formData.get("programEnd"),
      certificateName: formData.get("certificateName"),
      finalistCount: formData.get("finalistCount"),
      juryEnabled: formData.get("juryEnabled") === "on",
      simulations,
      trainings,
      aiTools,
    };

    try {
      const res = await fetch(editing ? `/api/programs/${initial!.id}` : "/api/programs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save program");
      const result = await res.json();
      setApplicationLink(`${window.location.origin}/${locale}/apply/${result.applicationToken}`);
      toast.success(editing ? tsa("saved") : t("created"));
      if (editing) router.refresh();
    } catch {
      toast.error(t("createFailed"));
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(applicationLink);
    toast.success(tc("copyLink"));
  }

  const totalModules = simulations.length + trainings.length + aiTools.length;
  const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : undefined);

  return (
    <DashboardLayout panel="super-admin" title={editing ? tsa("editTitle") : t("create")} userName={userName}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl pb-28">
        {initial?.pendingSetup && (
          <p className="ios-reveal mb-6 flex gap-2.5 rounded-2xl bg-warning/10 p-4 text-[13px] leading-[1.6] text-foreground ring-1 ring-warning/30">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {tsa("pendingNotice")}
          </p>
        )}

        <FormSection index={1} title={tsa("tenantTitle")} description={tsa("tenantDescription")}>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              {editing ? (
                <p className="text-[15px] font-semibold text-foreground">{initial!.tenantName}</p>
              ) : (
                <select
                  aria-label={tsa("tenantTitle")}
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-muted/60 px-3.5 text-[15px] text-foreground outline-none focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  <option value="" disabled>
                    {tsa("chooseTenant")}
                  </option>
                  {tenants?.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>
        </FormSection>

        <FormSection index={2} title={tb("basics.title")} description={tb("basics.description")}>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" required defaultValue={initial?.name} placeholder={tb("basics.namePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={initial?.description ?? undefined}
                  placeholder={tb("basics.descriptionPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantLimit">{t("participantLimit")}</Label>
                <Input
                  id="participantLimit"
                  name="participantLimit"
                  type="number"
                  min={1}
                  required
                  defaultValue={initial?.participantLimit}
                  placeholder="100"
                  className="sm:max-w-[220px]"
                />
              </div>
            </CardContent>
          </Card>
        </FormSection>

        <FormSection index={3} title={tb("type.title")} description={tb("type.description")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TYPES.map((type) => (
              <OptionCard
                key={type}
                icon={iconFor(type)}
                label={tp(type)}
                selected={projectType === type}
                onToggle={() => setProjectType(projectType === type ? "" : type)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection index={4} title={tb("timeline.title")} description={tb("timeline.description")}>
          <div className="grid gap-4 md:grid-cols-2">
            <DateWindow
              icon={CalendarRange}
              title={tb("timeline.application")}
              hint={tb("timeline.applicationHint")}
              startLabel={t("applicationStart")}
              endLabel={t("applicationEnd")}
              startName="applicationStart"
              endName="applicationEnd"
              startValue={initial?.pendingSetup ? undefined : date(initial?.applicationStart)}
              endValue={initial?.pendingSetup ? undefined : date(initial?.applicationEnd)}
              required
            />
            <DateWindow
              icon={CalendarClock}
              title={tb("timeline.programme")}
              hint={tb("timeline.programmeHint")}
              startLabel={t("simulationStart")}
              endLabel={t("simulationEnd")}
              startName="simulationStart"
              endName="simulationEnd"
              startValue={date(initial?.simulationStart)}
              endValue={date(initial?.simulationEnd)}
            />
          </div>
        </FormSection>

        {/* Drives the six-week student calendar and the jury finale. */}
        <FormSection index={5} title={tb("calendar.title")} description={tb("calendar.description")}>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <DateWindow
                icon={CalendarDays}
                title={tb("calendar.window")}
                hint={t("scheduleHint")}
                startLabel={t("programStart")}
                endLabel={t("programEnd")}
                startName="programStart"
                endName="programEnd"
                startValue={date(initial?.programStart)}
                endValue={date(initial?.programEnd)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="certificateName">{t("certificateName")}</Label>
                  <Input id="certificateName" name="certificateName" maxLength={200} defaultValue={initial?.certificateName ?? undefined} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finalistCount">{t("finalistCount")}</Label>
                  <Input id="finalistCount" name="finalistCount" type="number" min={1} max={1000} defaultValue={initial?.finalistCount ?? undefined} />
                </div>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" name="juryEnabled" defaultChecked={initial?.juryEnabled} className="h-4 w-4 accent-primary" />
                {t("juryEnabled")}
              </label>
            </CardContent>
          </Card>
        </FormSection>

        <FormSection
          index={6}
          title={t("simulations")}
          description={tb("modules.simulationsDescription")}
          counter={`${simulations.length}/${MAX_SIMULATIONS}`}
          counterActive={simulations.length >= MAX_SIMULATIONS}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {SIMULATION_TYPES.map((sim) => (
              <OptionCard
                key={sim}
                icon={iconFor(sim)}
                label={ts(sim)}
                selected={simulations.includes(sim)}
                disabled={simulations.length >= MAX_SIMULATIONS}
                onToggle={() => toggleItem(simulations, sim, setSimulations, MAX_SIMULATIONS)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection
          index={7}
          title={t("trainings")}
          description={tb("modules.trainingsDescription")}
          counter={trainings.length > 0 ? String(trainings.length) : undefined}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trainingOptions.map((training) => (
              <OptionCard
                key={training.key}
                icon={iconFor(training.key.replace(/_(training|sim)$/, ""), "training")}
                label={training.label}
                selected={trainings.includes(training.key)}
                onToggle={() => toggleItem(trainings, training.key, setTrainings)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection index={8} title={t("aiTools")} description={tb("modules.aiDescription")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_TOOLS.map((tool) => (
              <OptionCard
                key={tool}
                icon={iconFor(tool)}
                label={ta(tool)}
                selected={aiTools.includes(tool)}
                onToggle={() => toggleItem(aiTools, tool, setAiTools)}
              />
            ))}
          </div>
        </FormSection>

        {applicationLink && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="mt-8"
          >
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground">{tb("done.title")}</h2>
                    <p className="mt-0.5 text-[13px] leading-[1.6] text-muted-foreground">{tb("done.description")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2">
                  <Link2 className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    value={applicationLink}
                    readOnly
                    aria-label={t("applicationLink")}
                    className="h-9 min-w-0 flex-1 bg-transparent px-1 text-[14px] outline-none"
                  />
                  <Button type="button" size="sm" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {tc("copyLink")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sticky bar: the form is long enough that a submit button at the end
            of it is out of sight for most of the time spent filling it in. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
              {totalModules > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {tb("summary.selected", { count: totalModules })}
                </span>
              ) : (
                tb("summary.empty")
              )}
            </p>
            <Button type="button" variant="ghost" onClick={() => router.push("/super-admin/programs")}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="px-6">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? tc("loading") : editing && initial?.pendingSetup ? tsa("publish") : tc("save")}
            </Button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

/** A start/end pair presented as one window rather than four loose fields. */
function DateWindow({
  icon: Icon,
  title,
  hint,
  startLabel,
  endLabel,
  startName,
  endName,
  startValue,
  endValue,
  required,
}: {
  icon: typeof CalendarRange;
  title: string;
  hint: string;
  startLabel: string;
  endLabel: string;
  startName: string;
  endName: string;
  startValue?: string;
  endValue?: string;
  required?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">{hint}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={startName} className="text-[12px]">
              {startLabel}
            </Label>
            <Input id={startName} name={startName} type="date" required={required} defaultValue={startValue} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={endName} className="text-[12px]">
              {endLabel}
            </Label>
            <Input id={endName} name={endName} type="date" required={required} defaultValue={endValue} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
