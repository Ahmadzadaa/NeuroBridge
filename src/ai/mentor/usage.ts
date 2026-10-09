import { createHmac } from "crypto";
import type { Prisma } from "@prisma/client";
import { estimateCostUsd } from "@/ai/config";
import type { AiUsage } from "@/ai/types";

type Tx = Prisma.TransactionClient;

/**
 * Logs carry a keyed hash of the user id, never the id or anything personal.
 * Keyed, so a leaked log cannot be joined back to users by hashing known ids.
 */
export function hashUserId(userId: string): string {
  const key = process.env.AI_LOG_HASH_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "bizsim-ai-log";
  return createHmac("sha256", key).update(userId).digest("hex").slice(0, 32);
}

/** The pseudonym the model sees instead of a name. */
export function pseudonym(userHash: string): string {
  return `Participant_${userHash.slice(0, 6)}`;
}

export type SecurityEventType =
  | "OFF_TOPIC"
  | "INJECTION_SUSPECTED"
  | "CANARY_TRIGGERED"
  | "OUTPUT_REDACTED"
  | "LIMIT_EXCEEDED"
  | "TEMPORARY_BLOCK"
  | "TENANT_BUDGET_EXHAUSTED"
  | "GLOBAL_BUDGET_EXCEEDED"
  | "PROVIDER_ERROR";

export async function recordSecurityEvent(
  tx: Tx,
  event: { tenantId: string | null; userHash: string | null; simulationId: string | null; type: SecurityEventType; reason?: string }
): Promise<void> {
  await tx.aiSecurityEvent.create({
    data: {
      tenantId: event.tenantId,
      userHash: event.userHash,
      simulationId: event.simulationId,
      type: event.type,
      reason: event.reason?.slice(0, 120) ?? null,
    },
  });
}

export async function logUsage(
  tx: Tx,
  entry: {
    tenantId: string;
    userHash: string;
    simulationId: string;
    purpose: "topic_check" | "mentor" | "summary";
    model: string;
    usage: AiUsage;
    prefilter?: "on_topic" | "off_topic" | "invalid";
    rejectReason?: string;
  }
): Promise<void> {
  await tx.aiUsageLog.create({
    data: {
      tenantId: entry.tenantId,
      userHash: entry.userHash,
      simulationId: entry.simulationId,
      purpose: entry.purpose,
      model: entry.model,
      inputTokens: entry.usage.inputTokens,
      outputTokens: entry.usage.outputTokens,
      cacheReadTokens: entry.usage.cacheReadTokens,
      cacheWriteTokens: entry.usage.cacheWriteTokens,
      costUsd: estimateCostUsd(entry.model, entry.usage),
      prefilter: entry.prefilter ?? null,
      rejectReason: entry.rejectReason ?? null,
    },
  });
}
