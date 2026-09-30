"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A selectable tile, used for every choice on the programme builder.
 *
 * Replaces a row of label + switch. Fifteen of those in a column read as a
 * settings list — something you work through — while a grid of tiles reads as
 * a set of things you pick from, which is what this actually is. The whole
 * tile is the hit target, so selecting is one click anywhere rather than a
 * small toggle at the far right.
 *
 * It is a real `<button aria-pressed>` rather than a styled div: that gives
 * keyboard operation, focus rings and the pressed state to assistive
 * technology for free.
 */
export function OptionCard({
  icon: Icon,
  label,
  description,
  selected,
  disabled,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  /** Set when a cap is reached; the tile stays readable but is not selectable. */
  disabled?: boolean;
  onToggle: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      disabled={disabled && !selected}
      onClick={onToggle}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-subtle/60",
        disabled && !selected && "cursor-not-allowed opacity-45 hover:border-border hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
          selected ? "bg-primary text-primary-foreground" : "bg-subtle text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 pt-0.5">
        <span
          className={cn(
            "block text-[14px] font-semibold leading-snug text-pretty",
            selected ? "text-foreground" : "text-foreground/90",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-[1.5] text-muted-foreground">
            {description}
          </span>
        )}
      </span>

      {/* The checkmark animates in rather than appearing, so a selection reads
          as something that happened rather than as a repaint. */}
      <motion.span
        initial={false}
        animate={
          reducedMotion
            ? { opacity: selected ? 1 : 0 }
            : { scale: selected ? 1 : 0.6, opacity: selected ? 1 : 0 }
        }
        transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </motion.span>
    </motion.button>
  );
}
