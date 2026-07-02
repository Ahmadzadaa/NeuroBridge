"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Label } from "@/components/ui/typography";
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

const accentStyles: Record<
  StatCardAccent,
  { bar: string; iconWrap: string; icon: string }
> = {
  brand: {
    bar: "bg-gradient-to-r from-primary via-primary/70 to-primary/30",
    iconWrap: "bg-primary/10",
    icon: "text-primary",
  },
  success: {
    bar: "bg-gradient-to-r from-success via-success/70 to-success/30",
    iconWrap: "bg-success/10",
    icon: "text-success",
  },
  coin: {
    bar: "bg-gradient-to-r from-coin via-coin/70 to-coin/30",
    iconWrap: "bg-coin/10",
    icon: "text-coin",
  },
  purple: {
    bar: "bg-gradient-to-r from-chart-2 via-chart-2/70 to-chart-2/30",
    iconWrap: "bg-chart-2/10",
    icon: "text-chart-2",
  },
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
  const styles = accentStyles[accent];
  const reducedMotion = useReducedMotion();
  const numericValue = typeof value === "number" ? value : null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.25 } }}
      className="h-full"
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-2xl bg-card shadow-sm",
          "transition-shadow duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-hover",
          className
        )}
      >
        {/* Top gradient accent */}
        <div className={cn("h-1 w-full", styles.bar)} aria-hidden="true" />

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                styles.iconWrap
              )}
            >
              <Icon className={cn("h-5 w-5", styles.icon)} />
            </div>
            <Label className="text-right">{title}</Label>
          </div>

          <div className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-0.5px] text-foreground">
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
