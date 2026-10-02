"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** An iOS segmented control over server-rendered panels; only the chosen one is shown. */
export function InspectorTabs({ tabs, label }: { tabs: { key: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={label} className="grid rounded-[12px] bg-muted p-[3px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`inspector-tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`inspector-panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            className={cn(
              "h-8 truncate rounded-[9px] px-2 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200",
              active === tab.key ? "bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" id={`inspector-panel-${tab.key}`} aria-labelledby={`inspector-tab-${tab.key}`} hidden={active !== tab.key} className="space-y-5">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
