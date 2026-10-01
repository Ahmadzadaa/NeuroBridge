import type { Prisma } from "@prisma/client";
import { loadPrompt } from "@/ai/prompts";
import { containsCanary, sanitizeOutput } from "@/ai/guard/output-filter";
import type { AiMessageParam, AiUsage, LlmProvider } from "@/ai/types";

type Tx = Prisma.TransactionClient;
/** Runs a short database step in the caller's tenant context. */
export type DbRunner = <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;

export interface ConversationScope {
  tenantId: string;
  userId: string;
  simulationId: string;
}

/**
 * Only turns that were handled normally feed back into the model. Off-topic
 * and blocked turns are kept for the participant's own view but never reach
 * the next prompt, so a rejected injection cannot sneak in through history.
 */
const MEMORY_STATUSES = ["ok"];

/** `excludeId`: the turn being answered, which goes in separately as its own blocks. */
export async function loadConversation(tx: Tx, scope: ConversationScope, window: number, excludeId?: string) {
  const [summary, rows] = await Promise.all([
    tx.aiConversationSummary.findUnique({
      where: { tenantId_userId_simulationId: scope },
      select: { summary: true },
    }),
    tx.aiMessage.findMany({
      where: { ...scope, status: { in: MEMORY_STATUSES }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { createdAt: "desc" },
      take: window,
      select: { role: true, content: true, imageKey: true },
    }),
  ]);
  const recent = rows.reverse();
  // The API wants a user turn first.
  while (recent.length && recent[0].role !== "user") recent.shift();
  const messages: AiMessageParam[] = recent.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.role === "user" && m.imageKey ? `${m.content}\n[The participant attached an image earlier.]` : m.content,
  }));
  return { summary: summary?.summary ?? null, messages };
}

/** The participant's own recent turns, for the chat panel. */
export async function loadTranscript(tx: Tx, scope: ConversationScope, take = 30) {
  const rows = await tx.aiMessage.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, role: true, content: true, imageKey: true, status: true, createdAt: true },
  });
  return rows.reverse().map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    hasImage: Boolean(m.imageKey),
    status: m.status,
  }));
}

/**
 * Folds turns that have left the verbatim window into the rolling summary,
 * using the low-cost model. Runs after the reply has been delivered.
 */
export async function summarizeIfNeeded(params: {
  run: DbRunner;
  scope: ConversationScope;
  provider: LlmProvider;
  model: string;
  window: number;
  threshold: number;
  canary: string;
}): Promise<AiUsage | null> {
  const { run, scope } = params;
  // Read, call the model outside any transaction, then write.
  const [existing, eligible] = await run((tx) =>
    Promise.all([
      tx.aiConversationSummary.findUnique({ where: { tenantId_userId_simulationId: scope } }),
      tx.aiMessage.findMany({
        where: { ...scope, status: { in: MEMORY_STATUSES } },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      }),
    ])
  );
  const older = eligible.slice(0, Math.max(0, eligible.length - params.window));
  const fresh = older.filter((m) => !existing || m.createdAt > existing.coveredUntil);
  if (fresh.length < params.threshold) return null;

  const transcript = fresh.map((m) => `${m.role === "user" ? "Participant" : "Mentor"}: ${m.content}`).join("\n");
  const result = await params.provider.complete({
    model: params.model,
    system: [{ text: loadPrompt("summary"), cache: true }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `<previous_summary>\n${existing?.summary ?? "(none)"}\n</previous_summary>` },
          { type: "text", text: `<conversation>\n${transcript}\n</conversation>` },
          { type: "text", text: "Write the updated summary." },
        ],
      },
    ],
    maxTokens: 300,
  });
  if (containsCanary(result.text, params.canary)) return result.usage;
  const summary = sanitizeOutput(result.text).text.trim().slice(0, 1500);
  if (summary) {
    const coveredUntil = fresh[fresh.length - 1].createdAt;
    await run((tx) =>
      tx.aiConversationSummary.upsert({
        where: { tenantId_userId_simulationId: scope },
        create: { ...scope, summary, coveredUntil },
        update: { summary, coveredUntil },
      })
    );
  }
  return result.usage;
}
