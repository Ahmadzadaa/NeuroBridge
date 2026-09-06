import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A numbered step with its heading outside the card it introduces.
 *
 * The pattern these screens used before put the heading *inside* a card, which
 * made a long form read as one undifferentiated list and often duplicated the
 * tab or page title. Numbering gives the page a shape you can hold in your
 * head while working through it.
 *
 * Deliberately not animated in: a staggered fade leaves the section at opacity
 * 0 until an animation frame runs, so a background tab or a throttled device
 * shows a blank form. Content must never depend on an animation completing.
 */
export function FormSection({
  index,
  title,
  description,
  counter,
  counterActive,
  className,
  children,
}: {
  /** Omit to render the heading without a step number. */
  index?: number;
  title: string;
  description?: string;
  /** Short status shown beside the title, e.g. "2/4". */
  counter?: string;
  /** Draws the counter as filled — used when a cap has been reached. */
  counterActive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("mt-8 first:mt-2", className)}>
      <div className="mb-4 flex items-start gap-3">
        {index !== undefined && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[13px] font-bold text-primary-text">
            {index}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold tracking-[-0.2px] text-foreground">
              {title}
            </h2>
            {counter && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  counterActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-subtle text-muted-foreground",
                )}
              >
                {counter}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[13px] leading-[1.6] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
