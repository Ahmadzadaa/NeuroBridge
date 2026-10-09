import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SimStart typography scale.
 *
 * <Heading level={1}>Dashboard</Heading>       → 28px, 700, -0.5px tracking
 * <Heading level={2}>Program Reports</Heading> → 22px, 600, -0.3px tracking
 * <Heading level={3}>General Report</Heading>  → 18px, 600
 * <Label>ACTIVE PROGRAMS</Label>               → 11px, 600, 0.6px tracking, uppercase
 * <Body>Description text</Body>                → 14px, 400, 1.6 line-height
 * <Caption>Last updated 2 hours ago</Caption>  → 12px, 400, tertiary color
 */

type HeadingLevel = 1 | 2 | 3;

const headingStyles: Record<HeadingLevel, string> = {
  1: "text-[28px] font-bold leading-[1.3] tracking-[-0.5px]",
  2: "text-[22px] font-semibold leading-[1.3] tracking-[-0.3px]",
  3: "text-[18px] font-semibold leading-[1.3]",
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: "h1" | "h2" | "h3" | "h4";
}

export function Heading({
  level = 1,
  as,
  className,
  ...props
}: HeadingProps) {
  const Tag = as ?? (`h${level}` as const);
  return (
    <Tag
      data-slot="heading"
      className={cn("text-foreground", headingStyles[level], className)}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="typography-label"
      className={cn(
        "text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.6px] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function Body({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="typography-body"
      className={cn(
        "text-[14px] font-normal leading-[1.6] text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function Caption({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="typography-caption"
      className={cn(
        "text-[12px] font-normal leading-[1.5] text-tertiary",
        className
      )}
      {...props}
    />
  );
}
