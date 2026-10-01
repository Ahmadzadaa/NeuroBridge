"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusChip, type StatusChipVariant } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/ui/ios";
import { avatarTone } from "@/components/ui/avatar-tone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProgramOption {
  id: string;
  name: string;
}

interface ParticipantItem {
  id: string;
  status: string;
  registrationDate: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    university: string | null;
    faculty: string | null;
    specialty: string | null;
    studyYear: number | null;
  };
}

interface ParticipantsPageClientProps {
  userName: string;
  programs: ProgramOption[];
}

const PAGE_SIZE = 25;

export function ParticipantsPageClient({
  userName,
  programs,
}: ParticipantsPageClientProps) {
  const t = useTranslations("tenant.participants");
  const tc = useTranslations("common");
  const locale = useLocale();
  // tr-TR for az: Node and browsers format az dates differently.
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [items, setItems] = useState<ParticipantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // The spinner is turned on by whichever control changed the query, so this
  // effect only writes state once the response is in.
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (programFilter !== "all") {
      params.set("programId", programFilter);
    }

    fetch(`/api/participants?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setItems(data.items);
          setTotal(data.total);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, programFilter]);

  function changePage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function changeProgramFilter(next: string) {
    setLoading(true);
    setProgramFilter(next);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatName(user: ParticipantItem["user"]) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  }

  function statusChip(status: string) {
    const normalized = status.toLowerCase();
    const variant: StatusChipVariant =
      normalized === "active"
        ? "active"
        : normalized === "inactive"
          ? "inactive"
          : "pending";
    const label =
      normalized === "active"
        ? tc("active")
        : normalized === "inactive"
          ? tc("inactive")
          : normalized === "pending"
            ? tc("pending")
            : status;
    return <StatusChip variant={variant}>{label}</StatusChip>;
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <div className="space-y-6">
        <LargeTitle
          title={t("title")}
          subtitle={loading ? t("subtitle") : t("count", { count: total })}
          actions={
            <Select value={programFilter} onValueChange={(value) => changeProgramFilter(value ?? "all")}>
              <SelectTrigger className="h-11 w-full min-w-56 max-w-xs rounded-xl">
                {/* Without a formatter the trigger showed the programme's cuid. */}
                <SelectValue>
                  {(value: string) =>
                    value === "all"
                      ? t("allPrograms")
                      : (programs.find((program) => program.id === value)?.name ?? t("allPrograms"))
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allPrograms")}</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_96px] gap-4 border-b border-border/60 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground lg:grid">
            <span>{t("fullName")}</span>
            <span>{t("university")}</span>
            <span>{t("registrationDate")}</span>
            <span className="text-right">{tc("status")}</span>
          </div>
          <ul className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </li>
              ))
            ) : items.length === 0 ? (
              <li>
                <EmptyState title={tc("noData")} />
              </li>
            ) : (
              items.map((item, i) => {
                const initials =
                  [item.user.firstName?.[0], item.user.lastName?.[0]].filter(Boolean).join("") || item.user.email[0];
                return (
                  <li
                    key={item.id}
                    style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                    className="ios-reveal grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3.5 transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_96px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-semibold uppercase text-white ${avatarTone(item.user.id)}`}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-foreground">{formatName(item.user)}</p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {[item.user.email, item.user.phone].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="hidden min-w-0 lg:block">
                      {item.user.university ? (
                        <>
                          <p className="flex items-center gap-1.5 text-[14px] text-foreground">
                            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="truncate">{item.user.university}</span>
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            {[item.user.faculty, item.user.studyYear ? `${item.user.studyYear}. ${t("studyYear")}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">{t("noProfile")}</span>
                      )}
                    </div>
                    <span className="hidden text-[13px] tabular-nums text-muted-foreground lg:block">
                      {dateFmt.format(new Date(item.registrationDate))}
                    </span>
                    <span className="justify-self-end">{statusChip(item.status)}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {totalPages > 1 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={total}
            onPageChange={(p) => changePage(p)}
            itemLabel={t("title").toLowerCase()}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
