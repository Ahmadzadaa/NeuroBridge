import { describe, expect, it } from "vitest";
import { loadAiConfig } from "@/ai/config";
import { evaluateLimits, shouldBlock, type LimitSnapshot } from "@/ai/mentor/limits";

const limits = loadAiConfig({}).limits;
const now = new Date("2026-10-01T12:00:00Z");
const fresh: LimitSnapshot = {
  userMessagesToday: 0,
  userImagesToday: 0,
  lastUserMessageAt: null,
  tenantTokensThisMonth: 0,
  globalCostTodayUsd: 0,
  recentRejections: 0,
  blockedSince: null,
};

describe("evaluateLimits", () => {
  it("uses the documented defaults", () => {
    expect(limits).toMatchObject({ dailyMessages: 25, dailyImages: 3, maxMessageChars: 500 });
  });

  it("allows a normal request and counts it", () => {
    expect(evaluateLimits(fresh, limits, now, false)).toEqual({ ok: true, restricted: false, remaining: 24 });
  });

  it.each<[string, Partial<LimitSnapshot>, boolean, string]>([
    ["the daily message cap", { userMessagesToday: 25 }, false, "daily_messages"],
    ["the daily image cap", { userImagesToday: 3 }, true, "daily_images"],
    ["the minimum interval", { lastUserMessageAt: new Date(now.getTime() - 1000) }, false, "too_fast"],
    ["the tenant's monthly budget", { tenantTokensThisMonth: 2_000_000 }, false, "tenant_budget"],
    ["an active temporary block", { blockedSince: new Date(now.getTime() - 60_000) }, false, "temporarily_blocked"],
    ["images in restricted mode", { globalCostTodayUsd: 25 }, true, "images_disabled"],
  ])("stops at %s", (_, patch, hasImage, reason) => {
    const decision = evaluateLimits({ ...fresh, ...patch }, limits, now, hasImage);
    expect(decision).toMatchObject({ ok: false, reason });
  });

  it("keeps text going in restricted mode, with the flag set", () => {
    expect(evaluateLimits({ ...fresh, globalCostTodayUsd: 25 }, limits, now, false)).toMatchObject({ ok: true, restricted: true });
  });

  it("lifts the block once the block period is over", () => {
    const old = new Date(now.getTime() - (limits.blockMinutes + 1) * 60_000);
    expect(evaluateLimits({ ...fresh, blockedSince: old }, limits, now, false).ok).toBe(true);
  });

  it("reads limits from the environment", () => {
    const custom = loadAiConfig({ AI_DAILY_MESSAGES: "5", AI_MAX_MESSAGE_CHARS: "200", AI_TENANT_MONTHLY_TOKENS: "1000" }).limits;
    expect(custom).toMatchObject({ dailyMessages: 5, maxMessageChars: 200, tenantMonthlyTokens: 1000 });
    expect(evaluateLimits({ ...fresh, userMessagesToday: 5 }, custom, now, false)).toMatchObject({ reason: "daily_messages" });
  });
});

describe("shouldBlock", () => {
  it("blocks on the rejection that reaches the threshold", () => {
    expect(shouldBlock({ ...fresh, recentRejections: limits.anomalyThreshold - 2 }, limits)).toBe(false);
    expect(shouldBlock({ ...fresh, recentRejections: limits.anomalyThreshold - 1 }, limits)).toBe(true);
  });
});
