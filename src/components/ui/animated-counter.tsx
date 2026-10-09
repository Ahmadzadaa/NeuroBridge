"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * A number that counts up once when it scrolls into view.
 *
 * Its resting state is the real value: it used to start at 0 and rely on
 * `requestAnimationFrame`, which does not run in a hidden tab, so a page
 * opened in the background showed a coin balance of 0. The count-up now only
 * runs when the document is visible, and otherwise the value is simply there.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  suffix = "",
  prefix = "",
  className,
}: AnimatedCounterProps) {
  // Set only from animation frames; while it is null the real value shows.
  const [frame, setFrame] = useState<{ target: number; shown: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const reducedMotion = useReducedMotion();
  const locale = useLocale();
  // tr-TR for az: Node and browsers ship different az number data, which would break hydration.
  const format = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR");

  useEffect(() => {
    if (!isInView || reducedMotion || document.visibilityState !== "visible") return;

    let startTime: number | undefined;
    let handle: number;
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime: number) => {
      startTime ??= currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      if (progress < 1) {
        setFrame({ target: value, shown: Math.round(value * easeOutQuart(progress)) });
        handle = requestAnimationFrame(animate);
      } else {
        setFrame(null);
      }
    };

    handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [isInView, value, duration, reducedMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {format.format(!reducedMotion && frame?.target === value ? frame.shown : value)}
      {suffix}
    </span>
  );
}
