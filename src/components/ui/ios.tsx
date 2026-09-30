import type { CSSProperties, ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * iOS-style building blocks shared by the dashboards and public pages:
 * large titles, grouped (inset) lists, rows and app-icon tiles.
 * Server-safe — no hooks, no client JS.
 */

export type IconTone = "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose" | "fuchsia" | "slate";

const TONES: Record<IconTone, string> = {
  indigo: "from-indigo-500 to-blue-600",
  violet: "from-violet-500 to-indigo-600",
  sky: "from-sky-400 to-blue-600",
  emerald: "from-emerald-400 to-teal-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-orange-400 to-rose-500",
  fuchsia: "from-fuchsia-500 to-purple-600",
  slate: "from-slate-400 to-slate-600",
};

/** A glyph on a gradient squircle, like an iOS app or Settings icon. */
export function IconTile({
  icon: Icon,
  tone = "indigo",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = { sm: "h-8 w-8 rounded-[9px]", md: "h-10 w-10 rounded-[11px]", lg: "h-14 w-14 rounded-[16px]" }[size];
  const glyph = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm", TONES[tone], box, className)}
    >
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}

/** Staggered fade-up entrance; `index` orders siblings. */
export function Reveal({
  index = 0,
  as: Tag = "div",
  className,
  children,
}: {
  index?: number;
  as?: "div" | "section" | "li";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("ios-reveal", className)} style={{ "--i": index } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** iOS large title with an optional subtitle and trailing actions. */
export function LargeTitle({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ios-reveal flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-semibold text-primary">{eyebrow}</p>}
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.8px] text-foreground sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A grouped list: small caps header, rounded card of rows, footnote. */
export function InsetGroup({
  header,
  footer,
  action,
  className,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      {(header || action) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-4">
          {header && (
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">{header}</h2>
          )}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-[20px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 [&>*+*]:border-t [&>*+*]:border-border/60">
        {children}
      </div>
      {footer && <p className="mt-2 px-4 text-[13px] leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

/** One row of an InsetGroup. Becomes a link with a chevron when `href` is set. */
export function InsetRow({
  icon,
  tone,
  title,
  subtitle,
  value,
  trailing,
  href,
  className,
}: {
  icon?: LucideIcon;
  tone?: IconTone;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      {icon && <IconTile icon={icon} tone={tone} size="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-foreground">{title}</span>
        {subtitle && <span className="block text-[13px] leading-snug text-muted-foreground">{subtitle}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-right text-[15px] text-muted-foreground">{value}</span>}
      {trailing}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
    </>
  );
  const base = "flex min-h-[52px] items-center gap-3 px-4 py-2.5";
  return href ? (
    <Link href={href} className={cn(base, "transition-colors hover:bg-muted/50 active:bg-muted", className)}>
      {body}
    </Link>
  ) : (
    <div className={cn(base, className)}>{body}</div>
  );
}

/** Label + control + hint/error, stacked; the standard form field. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block px-1 text-[13px] font-medium text-foreground/80">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-[12px] text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
