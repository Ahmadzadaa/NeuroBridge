"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

const POLL_MS = 60_000;

/**
 * How many support requests need attention, for the menu badge. Refreshed on
 * every navigation (so replying clears it), when the window regains focus and
 * once a minute.
 */
export function useSupportBadge(enabled: boolean): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/support/badge", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (!cancelled) setCount(data.count);
      } catch {
        // Offline for a moment: keep the last number.
      }
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [enabled, pathname]);

  return enabled ? count : 0;
}
