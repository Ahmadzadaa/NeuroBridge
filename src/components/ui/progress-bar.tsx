"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Threshold = "auto" | "inverse" | "brand" | "coin";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /**
   * Color logic:
   * - "auto": green ≥70, amber 40–69, red <40 (completion rates — higher is better)
   * - "inverse": green <70, amber 70–85, red >85 (utilization — higher is worse)
   * - "brand" / "coin": fixed color
   */
  color?: Threshold;
  className?: string;
  "aria-label"?: string;
}

function fillColor(value: number, color: Threshold): string {
  if (color === "brand") return "bg-primary";
  if (color === "coin") return "bg-coin";
  if (color === "inverse") {
    if (value > 90) return "bg-danger";
    if (value >= 70) return "bg-warning";
    return "bg-success";
  }
  // auto — higher is better
  if (value >= 70) return "bg-success";
  if (value >= 40) return "bg-warning";
  return "bg-danger";
}

export function ProgressBar({
  value,
  color = "auto",
  className,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  // Start at 0 and fill on mount for the animated entrance
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-subtle",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[600ms] ease-[cubic-bezier(0,0,0.2,1)]",
          fillColor(clamped, color)
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
