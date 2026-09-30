"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Label } from "@/components/ui/typography";
import { IconTile, type IconTone } from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatCardAccent = "brand" | "success" | "coin" | "purple";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** e.g. "+12 this week" — rendered with an upward trend icon */
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  accent?: StatCardAccent;
  /** Suffix appended to numeric values, e.g. "%" */
  suffix?: string;
  /** Prefix for numeric values, e.g. "₺" */
  prefix?: string;
  className?: string;
  /** @deprecated kept for call-site compatibility; use `accent` instead */
  gradient?: string;
}

const accentTone: Record<StatCardAccent, IconTone> = {
  brand: "indigo",
  success: "emerald",
  coin: "amber",
  purple: "violet",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = "up",
  accent = "brand",
  suffix,
  prefix,
  className,
}: StatCardProps) {
  const reducedMotion = useReducedMotion();
  const numericValue = typeof value === "number" ? value : null;

  return (
    // The entry fade moved to CSS (`.animate-enter`). As a framer-motion
    // `initial`/`animate` pair it left the card at `opacity: 0` whenever the
    // document was hidden at mount, because `requestAnimationFrame` does not
    // run then — a dashboard opened in a background tab showed empty space
    // where its numbers should be. `whileHover` stays here: it is a response
    // to input, so it can only run when there is someone to see it.
    <motion.div
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.25 } }}
      className="animate-enter h-full"
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-[20px] bg-card ring-1 ring-border/60",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]",
          "transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_-16px_rgba(15,23,42,0.22)]",
          className
        )}
      >

        <div className="p-5">
          {/* The title used to be right-aligned and pushed to the far edge by
              `justify-between`. On a narrow card a two-word label wrapped and
              then sat flush against the border with no breathing room, so it
              reads from the left next to the icon instead. `min-w-0` lets it
              wrap inside the row rather than forcing the row wider. */}
          <div className="flex items-start gap-3">
            <IconTile icon={Icon} tone={accentTone[accent]} />
            <Label className="min-w-0 flex-1 pt-0.5 text-left leading-snug text-pretty break-words">
              {title}
            </Label>
          </div>

          <div className="mt-4 text-[34px] font-bold leading-[1.1] tracking-[-1px] tabular-nums text-foreground">
            {numericValue !== null ? (
              <AnimatedCounter value={numericValue} suffix={suffix} prefix={prefix} />
            ) : (
              value
            )}
          </div>

          {trend && (
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 text-[12px] font-medium",
                trendDirection === "up" && "text-success",
                trendDirection === "down" && "text-danger",
                trendDirection === "neutral" && "text-muted-foreground"
              )}
            >
              {trendDirection === "up" && <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
              {trendDirection === "down" && <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
              {trend}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
