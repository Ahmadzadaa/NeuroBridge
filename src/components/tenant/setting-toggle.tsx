"use client";

import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * One setting: icon, what it is, what it does, and its switch.
 *
 * The rows these screens used before were a bare label and a switch, so eight
 * of them in a column gave no clue what any of them actually changed. The
 * description is the point of the redesign; the icon is what makes the list
 * scannable.
 *
 * The whole row is a `<label>`, so clicking the text toggles the switch — the
 * previous version required hitting a 40px target at the far right.
 */
export function SettingToggle({
  id,
  icon: Icon,
  title,
  description,
  badge,
  checked,
  onCheckedChange,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional marker, e.g. for a setting that is stored but not yet acted on. */
  badge?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 p-4 transition-colors",
        "hover:bg-subtle/60 has-[:focus-visible]:bg-subtle/60",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          checked ? "bg-primary/10 text-primary-text" : "bg-subtle text-muted-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-warning-dark">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-muted-foreground">
          {description}
        </span>
      </span>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </label>
  );
}

/** Groups toggles into one card with hairline dividers between them. */
export function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
      {children}
    </div>
  );
}
