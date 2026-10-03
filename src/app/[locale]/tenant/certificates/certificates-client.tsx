"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Download, FileArchive, FileText, Loader2, RefreshCw, Search, Send, X } from "lucide-react";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CertificateThumbnail } from "@/components/certificates/certificate-thumbnail";
import { cn } from "@/lib/utils";

interface TemplateSummary {
  id: string;
  name: string;
  style: string;
  type: string;
  defaultBody: Record<string, string>;
  fields: string[];
}

type Recipient = { id: string; name: string; email: string };

interface Props {
  locale: string;
  userName: string;
  tenantName: string;
  programs: { id: string; name: string }[];
  participants: Recipient[];
  /** All participants of the organisation, even when only a first page was sent. */
  participantTotal: number;
  /** False for large rosters: searches then run on the server. */
  rosterComplete: boolean;
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

const SURFACE = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

/** A numbered step of the form: small caps header, then its card. */
function Step({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      <div className={cn(SURFACE, "p-4")}>{children}</div>
    </section>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block px-1 text-[13px] font-medium text-foreground/80">
      {children}
    </label>
  );
}

export function CertificatesPageClient({ locale, userName, tenantName, programs, participants, participantTotal, rosterComplete, templates }: Props) {
  const t = useTranslations("tenant.certificates");
  const tp = useTranslations("participant");
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
  const [remote, setRemote] = useState<{ query: string; results: Recipient[] } | null>(null);
  // Everyone seen so far, so selected recipients keep their names across searches.
  const [known, setKnown] = useState(() => new Map(participants.map((p) => [p.id, p])));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState<null | "merged" | "zip">(null);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<string | null>(null);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [body, setBody] = useState(() => templates[0]?.defaultBody[locale] ?? templates[0]?.defaultBody.az ?? "");
  const [issuerName, setIssuerName] = useState(tenantName);
  const [sig1Name, setSig1Name] = useState("");
  const [sig1Role, setSig1Role] = useState("");
  const [sig2Name, setSig2Name] = useState("");
  const [sig2Role, setSig2Role] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const template = useMemo(() => templates.find((x) => x.id === templateId) ?? templates[0], [templateId, templates]);
  const programName = programs.find((p) => p.id === programId)?.name ?? "";

  // Body copy follows the template, but only until the operator edits it —
  // so it is seeded on selection, not synced from an effect.
  const pickTemplate = useCallback(
    (id: string) => {
      setTemplateId(id);
      const next = templates.find((x) => x.id === id);
      if (next) setBody(next.defaultBody[locale] ?? next.defaultBody.az ?? "");
    },
    [templates, locale]
  );

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return participants.slice(0, 50);
    if (!rosterComplete) return remote?.query === query.trim() ? remote.results : [];
    return participants.filter((p) => fold(p.name).includes(q) || fold(p.email).includes(q)).slice(0, 50);
  }, [query, participants, rosterComplete, remote]);

  // Large rosters are searched on the server, a moment after typing stops.
  useEffect(() => {
    const q = query.trim();
    if (rosterComplete || !q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/certificates/recipients?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { results: Recipient[] };
        setRemote({ query: q, results: data.results });
        setKnown((prev) => new Map([...prev, ...data.results.map((p) => [p.id, p] as const)]));
      } catch {
        // Aborted by the next keystroke, or offline: the list simply stays as it was.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, rosterComplete]);

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

  const selectedNames = useMemo(() => selected.map((id) => known.get(id)?.name).filter((n): n is string => Boolean(n)), [selected, known]);

  // In bulk mode the preview steps through the chosen people; the index is kept in range as the choice changes.
  const safeIndex = Math.min(previewIndex, Math.max(0, selectedNames.length - 1));
  const previewName = (mode === "bulk" ? selectedNames[safeIndex] : recipientName)?.trim() ?? "";

  const signatures = useMemo(
    () => ({
      issuerName: issuerName.trim() || undefined,
      signature1Name: sig1Name.trim() || undefined,
      signature1Role: sig1Role.trim() || undefined,
      signature2Name: sig2Name.trim() || undefined,
      signature2Role: sig2Role.trim() || undefined,
    }),
    [issuerName, sig1Name, sig1Role, sig2Name, sig2Role]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
          body: JSON.stringify({ templateId, names: selectedNames, body: body.replaceAll("{program}", programName), ...signatures, format }),
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
    [t, selectedNames, templateId, body, programName, signatures]
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
            title: programName || (template ? templateLabel(template.id, "name", template.name) : "") || t("title"),
            body: body.replaceAll("{program}", programName),
            locale,
            ...signatures,
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
    [apiError, templateId, programId, programName, body, locale, template, templateLabel, signatures, t]
  );

  // The preview always renders for a real name: the picked person, or in bulk
  // mode the one being looked at (this used to send the empty single-mode name
  // and fail in bulk mode).
  const renderPreview = useCallback(async () => {
    if (!previewName || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          recipientName: previewName,
          body: body.replaceAll("{program}", programName).replaceAll("{name}", previewName),
          ...signatures,
        }),
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
  }, [t, previewName, body, programName, templateId, signatures]);

  // Debounced live preview.
  useEffect(() => {
    const id = setTimeout(renderPreview, 700);
    return () => clearTimeout(id);
  }, [renderPreview]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const has = (key: string) => template?.fields.includes(key) ?? false;
  const sampleName = previewName || t("sampleName");

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <div className="mx-auto min-w-0 max-w-7xl space-y-6 pb-10">
        <LargeTitle
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <div role="tablist" aria-label={t("title")} className="grid grid-cols-2 rounded-[12px] bg-muted p-[3px]">
              {(["single", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-8 rounded-[9px] px-4 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200",
                    mode === m ? "bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "single" ? t("single") : t("bulk")}
                </button>
              ))}
            </div>
          }
        />

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            {/* 1 — Template, shown as the paper it produces. */}
            <Step n={1} title={t("template")}>
              <div className="-mx-1 space-y-1" role="radiogroup" aria-label={t("template")}>
                {templates.map((tpl) => {
                  const active = tpl.id === templateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickTemplate(tpl.id)}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-[16px] p-2 text-left transition-colors duration-200",
                        active ? "bg-primary/[0.08] ring-1 ring-primary/50" : "hover:bg-muted/50"
                      )}
                    >
                      <span className="w-[92px] shrink-0 overflow-hidden rounded-[9px] shadow-[0_2px_6px_-2px_rgba(15,23,42,0.35)] ring-1 ring-black/5">
                        <CertificateThumbnail
                          type={tpl.type}
                          word={tp("certificateWord")}
                          typeLabel={templateLabel(tpl.id, "name", tpl.name)}
                          recipient={sampleName}
                          title={programName}
                          compact
                          className="rounded-none"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{templateLabel(tpl.id, "name", tpl.name)}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">{templateLabel(tpl.id, "style", tpl.style)}</span>
                      </span>
                      <span
                        className={cn(
                          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors",
                          active ? "bg-primary text-primary-foreground" : "ring-[1.5px] ring-muted-foreground/40"
                        )}
                        aria-hidden="true"
                      >
                        {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>

            {/* 2 — Who receives it. */}
            <Step
              n={2}
              title={mode === "single" ? t("participant") : t("recipients")}
              aside={
                mode === "bulk" && selected.length > 0 ? (
                  <button type="button" onClick={() => setSelected([])} className="text-[13px] font-medium text-primary hover:underline">
                    {t("clearAll")}
                  </button>
                ) : undefined
              }
            >
              {mode === "single" ? (
                <div className="space-y-4">
                  <div className="relative" ref={pickerRef}>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      value={query}
                      placeholder={t("search")}
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={open}
                      aria-controls="participant-list"
                      aria-label={t("participant")}
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
                          setHighlight((h) => Math.min(h + 1, matches.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlight((h) => Math.max(h - 1, 0));
                        } else if (e.key === "Enter" && open && matches[highlight]) {
                          e.preventDefault();
                          choose(matches[highlight]);
                        } else if (e.key === "Escape") {
                          setOpen(false);
                        }
                      }}
                      className="h-11 w-full rounded-xl pl-10 pr-10"
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
                        className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20 text-foreground/70 hover:bg-muted-foreground/30"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}

                    {open && (
                      <ul
                        id="participant-list"
                        role="listbox"
                        className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-2xl bg-popover/95 p-1 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-border/60 backdrop-blur-xl"
                      >
                        {matches.length === 0 && <li className="px-3 py-3 text-[14px] text-muted-foreground">{t("noMatch")}</li>}
                        {matches.map((p, i) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={p.id === participantId}
                              onMouseEnter={() => setHighlight(i)}
                              onClick={() => choose(p)}
                              className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left", i === highlight && "bg-accent")}
                            >
                              <UserAvatar userId={p.id} name={p.name} hasAvatar={false} className="h-8 w-8 text-[12px]" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium">{p.name}</span>
                                <span className="block truncate text-[12px] text-muted-foreground">{p.email}</span>
                              </span>
                              {p.id === participantId && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">
                      {query.trim() ? `${matches.length} ${t("found")}` : `${participantTotal} ${t("participant").toLocaleLowerCase(locale)}`}
                    </p>
                  </div>
                  <div>
                    <FieldLabel htmlFor="cert-recipient">{t("recipientName")}</FieldLabel>
                    <Input
                      id="cert-recipient"
                      className="h-11 w-full rounded-xl"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={t("sampleName")}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      value={query}
                      placeholder={t("search")}
                      autoComplete="off"
                      aria-label={t("search")}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-10 w-full rounded-xl pl-10"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-1 text-[13px]">
                    <span className="font-semibold text-foreground">
                      {selected.length} <span className="font-normal text-muted-foreground">/ {participantTotal} {t("selected")}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => Array.from(new Set([...prev, ...matches.map((m) => m.id)])))}
                      className="font-medium text-primary hover:underline"
                    >
                      {t("selectAll")} ({matches.length})
                    </button>
                  </div>
                  <ul className="max-h-[22rem] divide-y divide-border/50 overflow-y-auto overscroll-contain rounded-2xl bg-muted/30 ring-1 ring-border/50" role="group" aria-label={t("recipients")}>
                    {matches.length === 0 && <li className="px-4 py-3 text-[14px] text-muted-foreground">{t("noMatch")}</li>}
                    {matches.map((p) => {
                      const on = selected.includes(p.id);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(p.id)}
                            className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60", on && "bg-primary/[0.06]")}
                          >
                            <span
                              className={cn(
                                "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors",
                                on ? "bg-primary text-primary-foreground" : "ring-[1.5px] ring-muted-foreground/40"
                              )}
                              aria-hidden="true"
                            >
                              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <UserAvatar userId={p.id} name={p.name} hasAvatar={false} className="h-8 w-8 text-[12px]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium leading-tight">{p.name}</span>
                              <span className="block truncate text-[12px] text-muted-foreground">{p.email}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">{t("bulkHint", { token: "{name}" })}</p>
                </div>
              )}
            </Step>

            {/* 3 — What it says. */}
            <Step n={3} title={t("content")}>
              <div className="space-y-4">
                <div>
                  <FieldLabel>{t("program")}</FieldLabel>
                  <Select value={programId} onValueChange={(v) => setProgramId(v ?? "")}>
                    <SelectTrigger className="h-11 w-full rounded-xl" aria-label={t("program")}>
                      <SelectValue>{programName || t("noProgram")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="cert-body">{t("body")}</FieldLabel>
                  <Textarea id="cert-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl" />
                  <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">{t("hint", { token: "{program}" })}</p>
                </div>
                {has("issuerName") && (
                  <div>
                    <FieldLabel htmlFor="cert-issuer">{t("issuerName")}</FieldLabel>
                    <Input id="cert-issuer" className="h-11 w-full rounded-xl" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
                  </div>
                )}
              </div>
            </Step>

            {/* 4 — Who signs it. */}
            <Step n={4} title={t("signatures")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    [t("sig1"), sig1Name, setSig1Name, sig1Role, setSig1Role],
                    [t("sig2"), sig2Name, setSig2Name, sig2Role, setSig2Role],
                  ] as const
                ).map(([label, name, setName, role, setRole]) => (
                  <fieldset key={label} className="min-w-0 space-y-2">
                    <legend className="mb-1.5 px-1 text-[13px] font-semibold">{label}</legend>
                    <Input aria-label={`${label} — ${t("nameField")}`} placeholder={t("nameField")} className="h-10 w-full rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input
                      aria-label={`${label} — ${t("roleField")}`}
                      placeholder={t("roleField")}
                      className="h-10 w-full rounded-xl"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </fieldset>
                ))}
              </div>
            </Step>

            {/* What to do with it. */}
            <div className={cn(SURFACE, "space-y-3 p-3")}>
              {mode === "single" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!previewUrl}
                      onClick={() => {
                        if (!previewUrl) return;
                        const a = document.createElement("a");
                        a.href = previewUrl;
                        a.download = `${recipientName || "sertifikat"}.pdf`;
                        a.click();
                      }}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-muted text-[14px] font-semibold transition-colors hover:bg-muted/70 disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t("download")}
                    </button>
                    <button
                      type="button"
                      onClick={() => issueToAccounts([participantId])}
                      disabled={!participantId || issuing}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {issuing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      {issuing ? t("sending") : t("sendToAccount")}
                    </button>
                  </div>
                  <p className="px-1 text-[12px] leading-snug text-muted-foreground">{participantId ? t("sendHint") : t("needAccount")}</p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => issueToAccounts(selected)}
                    disabled={selected.length === 0 || issuing}
                    className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {issuing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                    {issuing ? t("sending") : `${t("sendToAccounts")} (${selected.length})`}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["merged", FileText, t("exportMerged")],
                        ["zip", FileArchive, t("exportZip")],
                      ] as const
                    ).map(([format, Icon, label]) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => exportBulk(format)}
                        disabled={selected.length === 0 || exporting !== null}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-muted px-3 text-[13px] font-semibold transition-colors hover:bg-muted/70 disabled:opacity-40"
                      >
                        {exporting === format ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                        <span className="truncate">{exporting === format ? t("exportingLabel") : label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="px-1 text-[12px] leading-snug text-muted-foreground">{t("sendHint")}</p>
                </>
              )}
              {issueResult && (
                <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {issueResult}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* The real PDF, as it will be issued. */}
          <section className={cn(SURFACE, "min-w-0 overflow-hidden xl:sticky xl:top-6")} aria-label={t("preview")}>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{t("preview")}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {t("pageFormat")}
                  {previewName ? ` · ${previewName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {mode === "bulk" && selectedNames.length > 1 && (
                  <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
                    <button
                      type="button"
                      aria-label={t("prevRecipient")}
                      disabled={safeIndex === 0}
                      onClick={() => setPreviewIndex(safeIndex - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-card disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-[3.5rem] text-center text-[12px] font-semibold tabular-nums">
                      {safeIndex + 1} / {selectedNames.length}
                    </span>
                    <button
                      type="button"
                      aria-label={t("nextRecipient")}
                      disabled={safeIndex >= selectedNames.length - 1}
                      onClick={() => setPreviewIndex(safeIndex + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-card disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={renderPreview}
                  disabled={busy || !previewName}
                  aria-label={t("refresh")}
                  title={t("refresh")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="bg-muted/30 p-4 sm:p-6">
              {previewUrl && previewName ? (
                <iframe
                  key={previewUrl}
                  src={`${previewUrl}#toolbar=0&navpanes=0&view=Fit`}
                  title={t("preview")}
                  className="aspect-[1.414/1] w-full rounded-xl bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.4)] ring-1 ring-black/5"
                />
              ) : (
                <div className="flex aspect-[1.414/1] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 text-center">
                  <div className="w-40 opacity-80">
                    <CertificateThumbnail
                      type={template?.type ?? "ACHIEVEMENT"}
                      word={tp("certificateWord")}
                      typeLabel={template ? templateLabel(template.id, "name", template.name) : ""}
                      recipient={t("sampleName")}
                      title={programName}
                    />
                  </div>
                  <p className="max-w-xs text-[14px] text-muted-foreground">
                    {busy ? t("rendering") : mode === "bulk" ? t("emptyBulk") : t("empty")}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
