"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";

interface CoinDisplayProps {
  balance: number;
  className?: string;
}

/**
 * Coin balance chip for the topbar. When the balance increases, a floating
 * "+N" indicator rises and fades above the counter.
 */
export function CoinDisplay({ balance, className }: CoinDisplayProps) {
  const previous = useRef(balance);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const diff = balance - previous.current;
    previous.current = balance;
    if (diff > 0) {
      setDelta(diff);
      const timer = setTimeout(() => setDelta(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [balance]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full bg-coin-light px-3 py-1.5 text-[13px] font-semibold text-coin-dark",
        className
      )}
      aria-label={`${balance.toLocaleString()} coins`}
    >
      <span aria-hidden="true">🪙</span>
      <AnimatedCounter value={balance} duration={800} />
      {delta !== null && (
        <span
          className="coin-float pointer-events-none absolute -top-1 right-1 text-[11px] font-bold text-coin"
          aria-hidden="true"
        >
          +{delta}
        </span>
      )}
    </div>
  );
}
