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
import {
  PROJECT_TYPES,
  SIMULATION_TYPES,
  TRAINING_TYPES,
  AI_TOOLS,
} from "@/lib/constants";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarRange,
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  Share2,
  Sparkles,
} from "lucide-react";

interface NewProgramClientProps {
  userName: string;
}

/** Simulations are capped by the product; the others are not. */
const MAX_SIMULATIONS = 4;

export function NewProgramClient({ userName }: NewProgramClientProps) {
  const t = useTranslations("tenant.programs");
  const tp = useTranslations("tenant.projectTypes");
  const ts = useTranslations("tenant.simulationTypes");
  const tt = useTranslations("tenant.trainingTypes");
  const ta = useTranslations("tenant.aiTools");
  const tc = useTranslations("common");
  const tb = useTranslations("tenant.programBuilder");
  const router = useRouter();
  const locale = useLocale();
  const reducedMotion = useReducedMotion();

  const [simulations, setSimulations] = useState<string[]>([]);
  const [trainings, setTrainings] = useState<string[]>([]);
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleItem(
    list: string[],
    item: string,
    setter: (v: string[]) => void,
    max?: number,
  ) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else if (!max || list.length < max) {
      setter([...list, item]);
    } else {
      // Was a hardcoded English string, so a Turkish or Azerbaijani admin hit
      // an English error in the middle of their own language.
      toast.error(tb("maxReached", { count: max }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectType) {
      toast.error(tb("typeRequired"));
      return;
    }
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      type: projectType,
      applicationStart: formData.get("applicationStart"),
      applicationEnd: formData.get("applicationEnd"),
      simulationStart: formData.get("simulationStart"),
      simulationEnd: formData.get("simulationEnd"),
      participantLimit: formData.get("participantLimit"),
      simulations,
      trainings,
      aiTools,
    };

    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create program");

      const result = await res.json();
      setApplicationLink(
        `${window.location.origin}/${locale}/apply/${result.applicationToken}`,
      );
      toast.success(t("created"));
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

  return (
    <DashboardLayout panel="tenant" title={t("create")} userName={userName}>
      {/* pb-28 clears the sticky action bar so the last field is never hidden. */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl pb-28">
        <FormSection
          index={1}
          title={tb("basics.title")}
          description={tb("basics.description")}

        >
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder={tb("basics.namePlaceholder")}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder={tb("basics.descriptionPlaceholder")}
                  className="rounded-xl"
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
                  placeholder="100"
                  className="rounded-xl sm:max-w-[220px]"
                />
              </div>
            </CardContent>
          </Card>
        </FormSection>

        {/* The type was a dropdown of seven keys. As tiles it is one glance and
            one click, and the chosen type stays visible while filling the rest. */}
        <FormSection
          index={2}
          title={tb("type.title")}
          description={tb("type.description")}

        >
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

        <FormSection
          index={3}
          title={tb("timeline.title")}
          description={tb("timeline.description")}

        >
          <div className="grid gap-4 md:grid-cols-2">
            <DateWindow
              icon={CalendarRange}
              title={tb("timeline.application")}
              hint={tb("timeline.applicationHint")}
              startLabel={t("applicationStart")}
              endLabel={t("applicationEnd")}
              startName="applicationStart"
              endName="applicationEnd"
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
            />
          </div>
        </FormSection>

        <FormSection
          index={4}
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
                onToggle={() =>
                  toggleItem(simulations, sim, setSimulations, MAX_SIMULATIONS)
                }
              />
            ))}
          </div>
        </FormSection>

        <FormSection
          index={5}
          title={t("trainings")}
          description={tb("modules.trainingsDescription")}
          counter={trainings.length > 0 ? String(trainings.length) : undefined}

        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRAINING_TYPES.map((training) => (
              <OptionCard
                key={training}
                icon={iconFor(training, "training")}
                label={tt(training)}
                selected={trainings.includes(training)}
                onToggle={() => toggleItem(trainings, training, setTrainings)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection
          index={6}
          title={t("aiTools")}
          description={tb("modules.aiDescription")}
          counter={aiTools.length > 0 ? String(aiTools.length) : undefined}

        >
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
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="mt-8"
          >
            <Card className="overflow-hidden rounded-2xl border-0 shadow-md">
              <div className="h-1 w-full bg-gradient-to-r from-primary via-chart-2 to-success" />
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground">
                      {tb("done.title")}
                    </h2>
                    <p className="mt-0.5 text-[13px] leading-[1.6] text-muted-foreground">
                      {tb("done.description")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-subtle p-2">
                  <Link2
                    className="ml-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={applicationLink}
                    readOnly
                    aria-label={t("applicationLink")}
                    className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={copyLink} className="rounded-xl">
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                    {tc("copyLink")}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    {tc("shareEmail")}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl">
                    <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    {tc("shareSocial")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sticky bar: the form is long enough that a submit button at the end
            of it is out of sight for most of the time spent filling it in. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl">
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="rounded-xl"
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-6">
              {loading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {loading ? tc("loading") : tc("save")}
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
  required,
}: {
  icon: typeof CalendarRange;
  title: string;
  hint: string;
  startLabel: string;
  endLabel: string;
  startName: string;
  endName: string;
  required?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-muted-foreground">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">
              {hint}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={startName} className="text-[12px]">
              {startLabel}
            </Label>
            <Input
              id={startName}
              name={startName}
              type="date"
              required={required}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={endName} className="text-[12px]">
              {endLabel}
            </Label>
            <Input
              id={endName}
              name={endName}
              type="date"
              required={required}
              className="rounded-xl"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
