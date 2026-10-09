/**
 * AI configuration, read from the environment only. Nothing here is a secret:
 * keys and credentials are picked up by the provider SDKs from their own
 * environment variables (or the EC2 instance role), never passed through code.
 */

export type ProviderName = "anthropic" | "bedrock";
export type ModelRole = "classifier" | "mentor" | "analysis";

/**
 * Model IDs per provider, checked against Anthropic's model list (Sept 2026).
 * Bedrock IDs carry the `anthropic.` prefix of the Bedrock Mantle endpoint;
 * confirm they are enabled in the account's region before switching.
 */
const DEFAULT_MODELS: Record<ProviderName, Record<ModelRole, string>> = {
  anthropic: {
    classifier: "claude-haiku-4-5",
    mentor: "claude-haiku-4-5",
    analysis: "claude-sonnet-5-5",
  },
  bedrock: {
    classifier: "anthropic.claude-haiku-4-5",
    mentor: "anthropic.claude-haiku-4-5",
    analysis: "anthropic.claude-sonnet-5-5",
  },
};

/** USD per million tokens (first-party list prices); override with AI_PRICES_JSON. */
const DEFAULT_PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
};

function int(env: Record<string, string | undefined>, name: string, fallback: number, min = 0): number {
  const raw = env[name];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  return Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
}

function num(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const value = Number(env[name] ?? "");
  return env[name] && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export interface AiConfig {
  enabled: boolean;
  provider: ProviderName;
  models: Record<ModelRole, string>;
  limits: {
    dailyMessages: number;
    dailyImages: number;
    maxMessageChars: number;
    maxOutputTokens: number;
    restrictedMaxOutputTokens: number;
    minIntervalSeconds: number;
    maxImageBytes: number;
    tenantMonthlyTokens: number;
    globalDailyUsd: number;
    /** Rejections in the anomaly window that trigger a temporary block. */
    anomalyThreshold: number;
    anomalyWindowMinutes: number;
    blockMinutes: number;
  };
  historyWindow: number;
  /** Older turns are folded into the summary once this many are unsummarised. */
  summarizeAfter: number;
  /** Stage kinds where participants may attach an image. */
  imageStages: Set<string>;
  alertEmail: string | null;
}

export function loadAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const provider: ProviderName = env.AI_PROVIDER === "bedrock" ? "bedrock" : "anthropic";
  const defaults = DEFAULT_MODELS[provider];
  return {
    enabled: env.AI_MENTOR_ENABLED !== "false",
    provider,
    models: {
      classifier: env.AI_MODEL_CLASSIFIER || defaults.classifier,
      mentor: env.AI_MODEL_MENTOR || defaults.mentor,
      analysis: env.AI_MODEL_ANALYSIS || defaults.analysis,
    },
    limits: {
      dailyMessages: int(env, "AI_DAILY_MESSAGES", 25),
      dailyImages: int(env, "AI_DAILY_IMAGES", 3),
      maxMessageChars: int(env, "AI_MAX_MESSAGE_CHARS", 500, 1),
      maxOutputTokens: int(env, "AI_MAX_OUTPUT_TOKENS", 600, 50),
      restrictedMaxOutputTokens: int(env, "AI_RESTRICTED_MAX_OUTPUT_TOKENS", 250, 50),
      minIntervalSeconds: int(env, "AI_MIN_INTERVAL_SECONDS", 4),
      maxImageBytes: int(env, "AI_MAX_IMAGE_BYTES", 2_000_000, 1),
      tenantMonthlyTokens: int(env, "AI_TENANT_MONTHLY_TOKENS", 2_000_000),
      globalDailyUsd: num(env, "AI_GLOBAL_DAILY_USD", 20),
      anomalyThreshold: int(env, "AI_ANOMALY_THRESHOLD", 8, 1),
      anomalyWindowMinutes: int(env, "AI_ANOMALY_WINDOW_MINUTES", 10, 1),
      blockMinutes: int(env, "AI_BLOCK_MINUTES", 15, 1),
    },
    historyWindow: 12,
    summarizeAfter: 6,
    imageStages: new Set((env.AI_IMAGE_STAGES ?? "unit").split(",").map((s) => s.trim()).filter(Boolean)),
    alertEmail: env.AI_ALERT_EMAIL || null,
  };
}

let prices: Record<string, { input: number; output: number }> | null = null;

/** Estimated USD cost of one call; cache reads bill at 0.1x input, cache writes at 1.25x. */
export function estimateCostUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
): number {
  if (!prices) {
    prices = { ...DEFAULT_PRICES };
    try {
      Object.assign(prices, JSON.parse(process.env.AI_PRICES_JSON || "{}"));
    } catch {
      // A malformed override keeps the defaults rather than zeroing costs.
    }
  }
  const p = prices[model.replace(/^(?:[a-z]+\.)?anthropic\./, "")] ?? prices[model] ?? { input: 5, output: 25 };
  const cost =
    (usage.inputTokens * p.input +
      usage.cacheReadTokens * p.input * 0.1 +
      usage.cacheWriteTokens * p.input * 1.25 +
      usage.outputTokens * p.output) /
    1_000_000;
  return Math.round(cost * 1e6) / 1e6;
}
