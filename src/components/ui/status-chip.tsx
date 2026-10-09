import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleDot,
  CircleSlash,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusChipVariant =
  | "active"
  | "inactive"
  | "pending"
  | "passed"
  | "failed"
  | "needsImprovement";

/**
 * Icons accompany color so state is never communicated by color alone
 * (accessibility requirement).
 */
const variantConfig: Record<
  StatusChipVariant,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { className: "bg-success-light text-success-dark", icon: CircleDot },
  inactive: { className: "bg-danger-light text-danger-dark", icon: CircleSlash },
  pending: { className: "bg-warning-light text-warning-dark", icon: Clock },
  passed: { className: "bg-success-light text-success-dark", icon: CheckCircle2 },
  failed: { className: "bg-danger-light text-danger-dark", icon: XCircle },
  needsImprovement: {
    className: "bg-warning-light text-warning-dark",
    icon: AlertTriangle,
  },
};

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusChipVariant;
}

export function StatusChip({
  variant,
  className,
  children,
  ...props
}: StatusChipProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <span
      data-slot="status-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[1.6]",
        config.className,
        className
      )}
      {...props}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
