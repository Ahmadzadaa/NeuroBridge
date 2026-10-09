import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { IconTile, type IconTone } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

/**
 * Dashboard building blocks: the greeting hero, progress ring, metric tiles
 * and the app-icon shortcut grid. Server-safe and CSS-animated only, so a page
 * opened in a background tab still renders its numbers.
 */

const CARD =
  "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

export function WelcomeHero({
  eyebrow,
  title,
  subtitle,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="ios-reveal relative overflow-hidden rounded-[26px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-[0_20px_50px_-24px_rgba(79,70,229,0.7)] sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4 sm:items-center">
        <div className="min-w-0">
          {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-white/70 sm:text-[13px]">{eyebrow}</p>}
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.6px] sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/80 sm:text-[15px]">{subtitle}</p>}
          {children && <div className="mt-5 hidden flex-wrap gap-2 sm:flex">{children}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children && <div className="relative mt-5 flex flex-wrap gap-2 sm:hidden">{children}</div>}
    </section>
  );
}

/** A pill-shaped button for use on the hero's gradient. */
export function HeroAction({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-transform active:scale-[0.97]",
        primary ? "bg-white text-indigo-700 shadow-sm hover:bg-white/90" : "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25"
      )}
    >
      {children}
    </Link>
  );
}

/** Circular progress, 0–100. The arc draws in once; its resting state is the value. */
export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  caption,
  onDark,
  responsive,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  caption?: ReactNode;
  onDark?: boolean;
  /** 88px on phones, `size` from sm up. */
  responsive?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  // A responsive ring takes its desktop size from a CSS variable; a fixed one is sized inline.
  const boxStyle: Record<string, string | number> = { width: size, height: size };
  if (responsive) boxStyle["--ring"] = `${size}px`;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", responsive && "h-[88px] w-[88px] sm:h-[var(--ring)] sm:w-[var(--ring)]")}
      style={responsive ? { "--ring": boxStyle["--ring"] } : boxStyle}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" role="img" aria-label={`${pct}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={onDark ? "stroke-white/20" : "stroke-muted"} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          className={cn("ring-draw", onDark ? "stroke-white" : "stroke-primary")}
          style={{ "--ring-circ": circ } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("font-bold tabular-nums leading-none tracking-[-0.5px]", responsive ? "text-[17px] sm:text-[24px]" : "text-[24px]")}>{label ?? `${pct}%`}</span>
        {caption && <span className={cn("mt-1 font-medium", responsive ? "text-[10px] sm:text-[11px]" : "text-[11px]", onDark ? "text-white/70" : "text-muted-foreground")}>{caption}</span>}
      </div>
    </div>
  );
}

export function MetricTile({
  icon,
  tone = "indigo",
  label,
  value,
  footnote,
  href,
  index = 0,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  label: ReactNode;
  value: ReactNode;
  footnote?: ReactNode;
  href?: string;
  index?: number;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />}
      </div>
      <p className="mt-4 text-[28px] font-bold leading-none tracking-[-0.8px] tabular-nums text-foreground">{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">{label}</p>
      {footnote && <p className="mt-1 text-[12px] text-muted-foreground/80">{footnote}</p>}
    </>
  );
  const cls = cn(CARD, "ios-reveal block h-full p-4 sm:p-5");
  const style = { "--i": index } as CSSProperties;
  return href ? (
    <Link href={href} style={style} className={cn(cls, "transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.98]")}>
      {body}
    </Link>
  ) : (
    <div style={style} className={cls}>
      {body}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>;
}

export type ShortcutItem = { href: string; icon: LucideIcon; tone: IconTone; label: string };

/** Home-screen style grid of app icons. */
export function ShortcutGrid({ items }: { items: ShortcutItem[] }) {
  return (
    <div className={cn(CARD, "grid grid-cols-4 gap-y-5 p-4 sm:grid-cols-6 sm:p-5 lg:grid-cols-8")}>
      {items.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          style={{ "--i": i } as CSSProperties}
          className="ios-reveal group flex flex-col items-center gap-2 rounded-2xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconTile icon={item.icon} tone={item.tone} size="lg" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-90" />
          <span className="line-clamp-2 text-[12px] font-medium leading-tight text-foreground/80">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

/** Section heading shared by dashboard blocks. */
export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 className="text-[20px] font-bold tracking-[-0.4px] text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[14px] font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}
