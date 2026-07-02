import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeIconState = "default" | "locked" | "earned" | "crown";

interface BadgeIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Emoji or glyph rendered inside the 3D wrapper */
  icon: string;
  state?: BadgeIconState;
}

/**
 * 3D badge icon — pure CSS depth effect, states defined in globals.css:
 * default (neumorphic), locked (grayscale), earned (gold glow),
 * crown (gold gradient + strong glow for mastery badges).
 */
export function BadgeIcon({
  icon,
  state = "default",
  className,
  ...props
}: BadgeIconProps) {
  return (
    <div
      data-slot="badge-icon"
      className={cn(
        "badge-icon-wrapper",
        state === "locked" && "locked",
        state === "earned" && "earned",
        state === "crown" && "crown",
        className
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </div>
  );
}
