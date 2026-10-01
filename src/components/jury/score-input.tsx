"use client";

import { cn } from "@/lib/utils";

/** Pills for small scales (up to 10), a slider beyond that. */
export function ScoreInput({
  label,
  maxScore,
  value,
  onChange,
}: {
  label: string;
  maxScore: number;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  if (maxScore <= 10) {
    return (
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {Array.from({ length: maxScore }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "h-11 rounded-xl text-[15px] font-semibold tabular-nums transition-all active:scale-95",
              value === n
                ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.7)]"
                : value !== undefined && n < value
                  ? "bg-primary/12 text-primary"
                  : "bg-muted/70 text-foreground/70 hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={0}
        max={maxScore}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-2 flex-1 accent-[var(--primary)]"
      />
      <span className="w-14 text-right text-[20px] font-bold tabular-nums">{value ?? "—"}</span>
    </div>
  );
}
