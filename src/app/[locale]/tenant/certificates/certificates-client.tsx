"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";

interface TemplateSummary {
  id: string;
  name: string;
  style: string;
  type: string;
  defaultBody: Record<string, string>;
  fields: string[];
}

interface Props {
  locale: string;
  userName: string;
  tenantName: string;
  programs: { id: string; name: string }[];
  participants: { id: string; name: string; email: string }[];
  templates: TemplateSummary[];
}

/** Fold Azerbaijani/Turkish diacritics so "Elekberova" also finds "Ələkbərova"
 *  — most people search without switching keyboard layout. */
const FOLD: Record<string, string> = {
  ə: "e",
  ğ: "g",
  ı: "i",
  i: "i",
  ş: "s",
  ö: "o",
  ü: "u",
  ç: "c",
  Ə: "e",
  Ğ: "g",
  İ: "i",
  I: "i",
  Ş: "s",
  Ö: "o",
  Ü: "u",
  Ç: "c",
};
function fold(value: string) {
  return Array.from(value.toLocaleLowerCase("az"))
    .map((ch) => FOLD[ch] ?? ch)
    .join("");
}

export function CertificatesPageClient({
  locale,
  userName,
  tenantName,
  programs,
  participants,
  templates,
}: Props) {
  const t = useTranslations("tenant.certificates");
  const apiError = useApiErrorMessage();

  // The template names and style captions live in the message files, not in
  // the template definitions, which carried a single hardcoded language. The
  // definition's own value stays as the fallback so an unknown template still
  // renders something rather than throwing.
  const templateLabel = useCallback(
    (id: string, field: "name" | "style", fallback: string) => {
      const key = `templates.${id}.${field}`;
      return t.has(key) ? t(key) : fallback;
    },
    [t]
  );

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [participantId, setParticipantId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState<null | "merged" | "zip">(null);
  const [listOpen, setListOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<string | null>(null);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [body, setBody] = useState(
    () =>
      templates[0]?.defaultBody[locale] ?? templates[0]?.defaultBody.az ?? "",
  );
  const [issuerName, setIssuerName] = useState(tenantName);
  const [sig1Name, setSig1Name] = useState("");
  const [sig1Role, setSig1Role] = useState("");
  const [sig2Name, setSig2Name] = useState("");
  const [sig2Role, setSig2Role] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const template = useMemo(
    () => templates.find((x) => x.id === templateId) ?? templates[0],
    [templateId, templates],
  );
  const programName = programs.find((p) => p.id === programId)?.name ?? "";

  // Body copy follows the template, but only until the operator edits it —
  // so it is seeded on selection, not synced from an effect.
  const pickTemplate = useCallback(
    (id: string) => {
      setTemplateId(id);
      const next = templates.find((x) => x.id === id);
      if (next) setBody(next.defaultBody[locale] ?? next.defaultBody.az ?? "");
    },
    [templates, locale],
  );

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return participants.slice(0, 50);
    return participants
      .filter((p) => fold(p.name).includes(q) || fold(p.email).includes(q))
      .slice(0, 50);
  }, [query, participants]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = useCallback((p: { id: string; name: string }) => {
    setParticipantId(p.id);
    setRecipientName(p.name);
    setQuery(p.name);
    setOpen(false);
  }, []);

  const buildPayload = useCallback(
    () => ({
      templateId,
      recipientName: recipientName.trim(),
      body: body
        .replaceAll("{program}", programName)
        .replaceAll("{name}", recipientName.trim()),
      issuerName: issuerName.trim() || undefined,
      signature1Name: sig1Name.trim() || undefined,
      signature1Role: sig1Role.trim() || undefined,
      signature2Name: sig2Name.trim() || undefined,
      signature2Role: sig2Role.trim() || undefined,
    }),
    [
      templateId,
      recipientName,
      body,
      programName,
      issuerName,
      sig1Name,
      sig1Role,
      sig2Name,
      sig2Role,
    ],
  );

  const selectedNames = useMemo(
    () =>
      selected
        .map((id) => participants.find((p) => p.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
    [selected, participants],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const exportBulk = useCallback(
    async (format: "merged" | "zip") => {
      if (selectedNames.length === 0) return;
      setExporting(format);
      setError(null);
      try {
        const res = await fetch("/api/certificates/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            names: selectedNames,
            body: body.replaceAll("{program}", programName),
            issuerName: issuerName.trim() || undefined,
            signature1Name: sig1Name.trim() || undefined,
            signature1Role: sig1Role.trim() || undefined,
            signature2Name: sig2Name.trim() || undefined,
            signature2Role: sig2Role.trim() || undefined,
            format,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sertifikatlar.${format === "zip" ? "zip" : "pdf"}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError(t("exportFailed"));
      } finally {
        setExporting(null);
      }
    },
    [
      t,
      selectedNames,
      templateId,
      body,
      programName,
      issuerName,
      sig1Name,
      sig1Role,
      sig2Name,
      sig2Role,
    ],
  );

  // Takes the ids explicitly: single mode sends to one picked participant,
  // bulk mode sends to the checked list. Both go through the same endpoint.
  const issueToAccounts = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) return;
      setIssuing(true);
      setError(null);
      setIssueResult(null);
      try {
        const res = await fetch("/api/certificates/issue-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            userIds,
            programId: programId || undefined,
            // The endpoint requires a non-empty title. A tenant with no
            // programmes yet would otherwise get a bare "Invalid input" 400.
            title:
            programName ||
            (template ? templateLabel(template.id, "name", template.name) : "") ||
            t("title"),
            body: body.replaceAll("{program}", programName),
            locale,
            issuerName: issuerName.trim() || undefined,
            signature1Name: sig1Name.trim() || undefined,
            signature1Role: sig1Role.trim() || undefined,
            signature2Name: sig2Name.trim() || undefined,
            signature2Role: sig2Role.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(apiError(data));
        const parts = [`${data.issued} ${t("sentOk")}`];
        if (data.already) parts.push(`${data.already} ${t("sentAlready")}`);
        if (data.failed) parts.push(`${data.failed} ${t("sentFailed")}`);
        setIssueResult(parts.join(" · "));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIssuing(false);
      }
    },
    [
      apiError,
      templateId,
      programId,
      programName,
      body,
      locale,
      template,
      templateLabel,
      issuerName,
      sig1Name,
      sig1Role,
      sig2Name,
      sig2Role,
      t,
    ],
  );

  const renderPreview = useCallback(async () => {
    const who = mode === "bulk" ? selectedNames[0] : recipientName;
    if (!who?.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPreviewUrl(url);
    } catch {
      setError(t("previewFailed"));
    } finally {
      setBusy(false);
    }
  }, [t, buildPayload, recipientName, body, mode, selectedNames]);

  // Debounced live preview.
  useEffect(() => {
    const id = setTimeout(renderPreview, 700);
    return () => clearTimeout(id);
  }, [renderPreview]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    ph = "",
  ) => (
    <div className="min-w-0 space-y-1.5">
      <Label className="block text-xs leading-snug text-muted-foreground">
        {label}
      </Label>
      <Input
        className="w-full"
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
      />
    </div>
  );

  const has = (key: string) => template?.fields.includes(key) ?? false;

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <div className="min-w-0 space-y-6 pb-10">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />

        <div
          role="tablist"
          aria-label={t("title")}
          className="inline-flex rounded-lg bg-muted p-1"
        >
          {(["single", "bulk"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "single" ? t("single") : t("bulk")}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Card className="min-w-0 space-y-5 p-6">
            <div className="min-w-0 space-y-1.5">
              <Label className="block text-xs leading-snug text-muted-foreground">
                {t("template")}
              </Label>
              <div className="grid gap-2">
                {templates.map((tpl) => {
                  const active = tpl.id === templateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => pickTemplate(tpl.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`block text-sm leading-snug break-words ${
                          active ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {templateLabel(tpl.id, "name", tpl.name)}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground break-words">
                        {templateLabel(tpl.id, "style", tpl.style)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === "single" && (
              <div className="min-w-0 space-y-1.5" ref={pickerRef}>
                <Label className="block text-xs leading-snug text-muted-foreground">
                  {t("participant")}
                </Label>
                <div className="relative">
                  <Input
                    value={query}
                    placeholder={t("search")}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="participant-list"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setParticipantId("");
                      setRecipientName(e.target.value);
                      setHighlight(0);
                      setOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpen(true);
                        setHighlight((h) =>
                          Math.min(h + 1, matches.length - 1),
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlight((h) => Math.max(h - 1, 0));
                      } else if (
                        e.key === "Enter" &&
                        open &&
                        matches[highlight]
                      ) {
                        e.preventDefault();
                        choose(matches[highlight]);
                      } else if (e.key === "Escape") {
                        setOpen(false);
                      }
                    }}
                    className="w-full pr-8"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label={t("clear")}
                      onClick={() => {
                        setQuery("");
                        setParticipantId("");
                        setRecipientName("");
                        setOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}

                  {open && (
                    <ul
                      id="participant-list"
                      role="listbox"
                      className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                    >
                      {matches.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">
                          {t("noMatch")}
                        </li>
                      )}
                      {matches.map((p, i) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={p.id === participantId}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => choose(p)}
                            className={`block w-full rounded-md px-3 py-2 text-left ${
                              i === highlight ? "bg-accent" : ""
                            }`}
                          >
                            <span className="block truncate text-sm">
                              {p.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.email}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {query.trim()
                    ? `${matches.length} ${t("found")}`
                    : `${participants.length} ${t("participant").toLocaleLowerCase(locale)}`}
                </p>
              </div>
            )}

            {mode === "bulk" && (
              <div className="min-w-0 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label className="block text-xs leading-snug text-muted-foreground">
                    {t("participant")}
                  </Label>
                  <span className="text-xs font-semibold text-primary">
                    {selected.length} {t("selected")}
                  </span>
                </div>

                {/* Chips keep the choice visible while the list is folded away. */}
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNames.slice(0, 8).map((name, i) => (
                      <span
                        key={selected[i]}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs text-primary"
                      >
                        <span className="truncate">{name}</span>
                        <button
                          type="button"
                          aria-label={`${name} — ${t("clear")}`}
                          onClick={() => toggle(selected[i])}
                          className="rounded-full px-1 leading-none hover:bg-primary/20"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {selected.length > 8 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        +{selected.length - 8}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected([])}
                      className="text-xs font-medium text-muted-foreground hover:underline"
                    >
                      {t("clearAll")}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={listOpen}
                  onClick={() => setListOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span>{listOpen ? t("collapseList") : t("expandList")}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {participants.length}
                    <span aria-hidden className={listOpen ? "rotate-180" : ""}>
                      ⌄
                    </span>
                  </span>
                </button>

                {listOpen && (
                  <div className="space-y-2">
                    <Input
                      value={query}
                      placeholder={t("search")}
                      autoComplete="off"
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setHighlight(0);
                      }}
                      className="h-8 w-full text-sm"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((prev) =>
                            Array.from(
                              new Set([...prev, ...matches.map((m) => m.id)]),
                            ),
                          )
                        }
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t("selectAll")} ({matches.length})
                      </button>
                      <span className="text-[11px] text-muted-foreground">
                        {query.trim() ? `${matches.length} ${t("found")}` : ""}
                      </span>
                    </div>

                    <ul
                      className="divide-y divide-border overflow-y-auto rounded-lg border border-border"
                      style={{ maxHeight: "15rem" }}
                    >
                      {matches.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">
                          {t("noMatch")}
                        </li>
                      )}
                      {matches.map((p) => {
                        const on = selected.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label
                              className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-muted/50 ${
                                on ? "bg-primary/5" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggle(p.id)}
                                className="h-3.5 w-3.5 shrink-0 accent-primary"
                              />
                              <span className="min-w-0 flex-1 truncate text-sm leading-tight">
                                {p.name}
                              </span>
                              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                                {p.email.split("@")[0]}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t("bulkHint", { token: "{name}" })}
                </p>
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <Label className="block text-xs leading-snug text-muted-foreground">
                {t("program")}
              </Label>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="h-9 w-full min-w-0 truncate rounded-md border border-input bg-background px-3 text-sm"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {mode === "single" &&
              field(
                t("recipientName"),
                recipientName,
                setRecipientName,
                "Nərgiz Ələkbərova",
              )}

            <div className="min-w-0 space-y-1.5">
              <Label className="block text-xs leading-snug text-muted-foreground">
                {t("body")}
              </Label>
              <Textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("hint", { token: "{program}" })}
              </p>
            </div>

            {has("issuerName") &&
              field(t("issuerName"), issuerName, setIssuerName)}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-semibold">{t("sig1")}</p>
                {field(t("nameField"), sig1Name, setSig1Name)}
                {field(t("roleField"), sig1Role, setSig1Role)}
              </div>
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-semibold">{t("sig2")}</p>
                {field(t("nameField"), sig2Name, setSig2Name)}
                {field(t("roleField"), sig2Role, setSig2Role)}
              </div>
            </div>

            {mode === "bulk" && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() => issueToAccounts(selected)}
                  disabled={selected.length === 0 || issuing}
                  className="min-w-[10rem] flex-1"
                >
                  {issuing
                    ? t("sending")
                    : `${t("sendToAccounts")} (${selected.length})`}
                </Button>
                <Button
                  onClick={() => exportBulk("merged")}
                  disabled={selected.length === 0 || exporting !== null}
                  variant="outline"
                  className="min-w-[10rem] flex-1"
                >
                  {exporting === "merged"
                    ? t("exportingLabel")
                    : t("exportMerged")}
                </Button>
                <Button
                  onClick={() => exportBulk("zip")}
                  disabled={selected.length === 0 || exporting !== null}
                  variant="outline"
                  className="min-w-[10rem] flex-1"
                >
                  {exporting === "zip" ? t("exportingLabel") : t("exportZip")}
                </Button>
              </div>
            )}

            {mode === "single" && (
              <div className="space-y-1.5 pt-1">
                <Button
                  onClick={() => issueToAccounts([participantId])}
                  disabled={!participantId || issuing}
                  className="w-full"
                >
                  {issuing ? t("sending") : t("sendToAccount")}
                </Button>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {participantId ? t("sendHint") : t("needAccount")}
                </p>
              </div>
            )}

            <div
              className={`flex-wrap gap-2 pt-1 ${mode === "single" ? "flex" : "hidden"}`}
            >
              <Button
                onClick={renderPreview}
                disabled={busy}
                variant="outline"
                className="flex-1 min-w-[9rem]"
              >
                {busy ? t("rendering") : t("refresh")}
              </Button>
              <Button
                disabled={!previewUrl}
                onClick={() => {
                  if (!previewUrl) return;
                  const a = document.createElement("a");
                  a.href = previewUrl;
                  a.download = `${recipientName || "sertifikat"}.pdf`;
                  a.click();
                }}
                className="flex-1 min-w-[9rem]"
              >
                {t("download")}
              </Button>
            </div>
            {mode === "bulk" && (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("sendHint")}
              </p>
            )}
            {issueResult && (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                {issueResult}
              </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium">
              {t("preview")} — {t("pageFormat")}
              {mode === "bulk" && selectedNames.length > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">
                  1 / {selectedNames.length} · {selectedNames[0]}
                </span>
              )}
            </div>
            <div className="bg-muted/20 p-4">
              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={`${previewUrl}#toolbar=0&navpanes=0&view=Fit`}
                  title={t("preview")}
                  className="h-[520px] w-full rounded-md border bg-white"
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  {busy ? t("rendering") : t("empty")}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
