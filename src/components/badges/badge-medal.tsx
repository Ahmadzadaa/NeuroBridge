import { createElement } from "react";
import { Crown, Lock } from "lucide-react";
import { badgeIcon, categoryTone } from "@/lib/badges/badge-visuals";
import { cn } from "@/lib/utils";

export type MedalState = "earned" | "next" | "locked";

/**
 * A badge as a medal: the category's calm tint when earned, gold for the
 * crown (mastery) badge, a dashed outline for the next one to earn and a
 * muted disc with a lock otherwise. Decorative — the card carries the text.
 */
export function BadgeMedal({
  badgeKey,
  category,
  crown,
  state,
  className,
}: {
  badgeKey: string;
  category: string;
  crown: boolean;
  state: MedalState;
  className?: string;
}) {
  const tone = categoryTone(category);
  const earned = state === "earned";

  return (
    <span aria-hidden="true" className={cn("relative inline-flex h-14 w-14 shrink-0", className)}>
      <span
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full ring-1 ring-inset transition-colors",
          earned && crown && "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_6px_18px_-8px_rgba(245,158,11,0.8)] ring-amber-200/60",
          earned && !crown && tone.soft,
          state === "next" && "bg-transparent text-muted-foreground ring-0 outline-2 outline-offset-[-2px] outline-dashed outline-border",
          state === "locked" && "bg-muted/60 text-muted-foreground/45 ring-border/60"
        )}
      >
        {createElement(badgeIcon(badgeKey, category), { className: "h-6 w-6", strokeWidth: 1.75 })}
      </span>
      {crown && (
        <span
          className={cn(
            "absolute -top-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full ring-2 ring-card",
            earned ? "bg-amber-400 text-amber-950" : "bg-muted text-muted-foreground"
          )}
        >
          <Crown className="h-3 w-3" strokeWidth={2.25} />
        </span>
      )}
      {state === "locked" && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
          <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}
