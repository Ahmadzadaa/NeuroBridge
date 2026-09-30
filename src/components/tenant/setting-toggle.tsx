"use client";

import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { IconTile } from "@/components/ui/ios";
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
        "flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors",
        "hover:bg-muted/40 has-[:focus-visible]:bg-muted/40 active:bg-muted/60",
      )}
    >
      <IconTile
        icon={Icon}
        tone={checked ? "indigo" : "slate"}
        className={cn("transition-opacity duration-300", !checked && "opacity-60")}
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-warning-dark">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[13px] leading-[1.5] text-muted-foreground">
          {description}
        </span>
      </span>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </label>
  );
}

/** Groups toggles into one card with hairline dividers between them. */
export function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-[20px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
      {children}
    </div>
  );
}
