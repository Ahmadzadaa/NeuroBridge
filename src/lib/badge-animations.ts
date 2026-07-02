import confetti from "canvas-confetti";
import { toast } from "sonner";
import { tokens } from "@/lib/design-tokens";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fired when a badge is earned (call from the API success handler):
 * confetti burst + toast. Coin counters animate on their own via
 * <AnimatedCounter> / <CoinDisplay> when the balance updates.
 */
export function triggerBadgeEarnAnimation(badgeName: string, coinValue: number) {
  if (!prefersReducedMotion()) {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: [
        tokens.colors.brand.DEFAULT,
        tokens.colors.coin.DEFAULT,
        tokens.colors.success.DEFAULT,
      ],
    });
  }

  toast.success(`🏅 ${badgeName} (+${coinValue} 🪙)`, { duration: 5000 });
}
