"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PROJECT_TYPES, SIMULATION_TYPES, TRAINING_TYPES, AI_TOOLS } from "@/lib/constants";
import { toast } from "sonner";
import { Copy, Link2, Mail, Share2 } from "lucide-react";

interface NewProgramClientProps {
  userName: string;
}

export function NewProgramClient({ userName }: NewProgramClientProps) {
  const t = useTranslations("tenant.programs");
  const tp = useTranslations("tenant.projectTypes");
  const ts = useTranslations("tenant.simulationTypes");
  const tt = useTranslations("tenant.trainingTypes");
  const ta = useTranslations("tenant.aiTools");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  const [simulations, setSimulations] = useState<string[]>([]);
  const [trainings, setTrainings] = useState<string[]>([]);
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void, max?: number) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else if (!max || list.length < max) {
      setter([...list, item]);
    } else {
      toast.error(`Maximum ${max} selections allowed`);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create program");

      const result = await res.json();
      setApplicationLink(
        `${window.location.origin}/${locale}/apply/${result.applicationToken}`
      );
      toast.success("Program created!");
    } catch {
      toast.error("Failed to create program");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(applicationLink);
    toast.success(tc("copyLink"));
  }

  return (
    <DashboardLayout panel="tenant" title={t("create")} userName={userName}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("name")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" className="rounded-xl" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v ?? "")}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder={t("type")} />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tp(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="applicationStart">{t("applicationStart")}</Label>
                <Input id="applicationStart" name="applicationStart" type="date" required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicationEnd">{t("applicationEnd")}</Label>
                <Input id="applicationEnd" name="applicationEnd" type="date" required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simulationStart">{t("simulationStart")}</Label>
                <Input id="simulationStart" name="simulationStart" type="date" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simulationEnd">{t("simulationEnd")}</Label>
                <Input id="simulationEnd" name="simulationEnd" type="date" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programStart">{t("programStart")}</Label>
                <Input id="programStart" name="programStart" type="date" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programEnd">{t("programEnd")}</Label>
                <Input id="programEnd" name="programEnd" type="date" className="rounded-xl" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("scheduleHint")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="certificateName">{t("certificateName")}</Label>
                <Input id="certificateName" name="certificateName" maxLength={200} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalistCount">{t("finalistCount")}</Label>
                <Input id="finalistCount" name="finalistCount" type="number" min={1} max={1000} className="rounded-xl" />
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" name="juryEnabled" className="h-4 w-4 accent-primary" />
              {t("juryEnabled")}
            </label>
            <div className="space-y-2">
              <Label htmlFor="participantLimit">{t("participantLimit")}</Label>
              <Input id="participantLimit" name="participantLimit" type="number" min={1} required className="rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("simulations")} (max 4)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SIMULATION_TYPES.map((sim) => (
              <div key={sim} className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm">{ts(sim)}</span>
                <Switch
                  checked={simulations.includes(sim)}
                  onCheckedChange={() => toggleItem(simulations, sim, setSimulations, 4)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("trainings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TRAINING_TYPES.map((training) => (
              <div key={training} className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm">{tt(training)}</span>
                <Switch
                  checked={trainings.includes(training)}
                  onCheckedChange={() => toggleItem(trainings, training, setTrainings)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("aiTools")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_TOOLS.map((tool) => (
              <div key={tool} className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm">{ta(tool)}</span>
                <Switch
                  checked={aiTools.includes(tool)}
                  onCheckedChange={() => toggleItem(aiTools, tool, setAiTools)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {applicationLink && (
          <Card className="rounded-2xl border-0 bg-gradient-to-r from-primary/10 to-chart-2/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t("applicationLink")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={applicationLink} readOnly className="rounded-xl" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={copyLink} className="rounded-xl">
                  <Copy className="mr-2 h-4 w-4" />
                  {tc("copyLink")}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl">
                  <Mail className="mr-2 h-4 w-4" />
                  {tc("shareEmail")}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl">
                  <Share2 className="mr-2 h-4 w-4" />
                  {tc("shareSocial")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="rounded-xl">
            {loading ? tc("loading") : tc("save")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl">
            {tc("cancel")}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
