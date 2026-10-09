import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Simple inline SVG illustration — an empty inbox tray. */
function EmptyIllustration() {
  return (
    <svg
      width="96"
      height="72"
      viewBox="0 0 96 72"
      fill="none"
      aria-hidden="true"
      className="text-muted-foreground/40"
    >
      <rect x="14" y="18" width="68" height="44" rx="8" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M14 40h20l4 7h20l4-7h20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 10l-4-5M48 8V2M66 10l4-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <EmptyIllustration />
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[13px] leading-[1.6] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
