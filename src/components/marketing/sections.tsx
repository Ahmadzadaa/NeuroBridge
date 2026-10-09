import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScreenshotMock, type MockVariant } from "@/components/marketing/screenshot-mock";

/**
 * Layout primitives shared by the marketing pages.
 *
 * They exist so every section on every page uses the same rhythm — one place
 * to change the vertical spacing or the container width, rather than six
 * pages that drift apart.
 */

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("px-4 py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      {eyebrow && (
        <p className="text-[12px] font-semibold uppercase tracking-[0.8px] text-primary-text">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-balance break-words text-foreground sm:text-[34px]">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[16px] leading-[1.7] text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Stands in for a product screenshot that has not been taken yet.
 *
 * Renders a schematic wireframe of the screen it represents rather than an
 * empty box: the page can be reviewed as a whole, while the shapes stay
 * obviously diagrammatic so nobody mistakes one for a real capture.
 *
 * The real aspect ratio is reserved, so swapping in `next/image` later does
 * not move anything on the page. `label` is the accessible name and doubles as
 * the future `alt` text.
 */
export function ScreenshotPlaceholder({
  label,
  variant,
  ratio = "16 / 10",
  className,
}: {
  label: string;
  variant: MockVariant;
  ratio?: string;
  className?: string;
}) {
  return (
    <figure
      style={{ aspectRatio: ratio }}
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-subtle p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div role="img" aria-label={label} className="h-full w-full">
        <ScreenshotMock variant={variant} />
      </div>
      {/* Marks the image as schematic without relying on the caption text. */}
      <figcaption className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-card/85 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.4px] text-tertiary backdrop-blur-sm">
        UI
      </figcaption>
    </figure>
  );
}
