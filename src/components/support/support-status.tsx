import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, MessageCircleReply } from "lucide-react";
import type { SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

const STYLE: Record<SupportStatus, { icon: typeof Clock; className: string }> = {
  OPEN: { icon: Clock, className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  ANSWERED: { icon: MessageCircleReply, className: "bg-primary/10 text-primary" },
  RESOLVED: { icon: CheckCircle2, className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
};

export function SupportStatusPill({ status, className }: { status: SupportStatus; className?: string }) {
  const t = useTranslations("support.status");
  const { icon: Icon, className: tone } = STYLE[status] ?? STYLE.OPEN;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", tone, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(status)}
    </span>
  );
}
