import { describe, expect, it } from "vitest";
import { getLivenessStatus } from "@/lib/monitoring/health";

describe("health monitoring", () => {
  it("returns ok liveness status", () => {
    const status = getLivenessStatus();
    expect(status.status).toBe("ok");
    expect(status.timestamp).toBeTruthy();
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });
});
