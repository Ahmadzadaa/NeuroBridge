/**
 * Results-reveal gate for hackathon rankings.
 *
 * - revealAt == null  → rankings are live (default, backward compatible)
 * - revealAt in future → rankings hidden from participants until that moment
 * - revealAt in past   → rankings visible (announced)
 *
 * Juries and tenant staff always see live rankings regardless of the gate.
 */
export function resultsVisible(revealAt: Date | null): boolean {
  return revealAt === null || revealAt.getTime() <= Date.now();
}
