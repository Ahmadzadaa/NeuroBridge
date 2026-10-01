import { randomUUID } from "crypto";
import { getTranslations } from "next-intl/server";
import { loadAiConfig, type AiConfig } from "@/ai/config";
import { getProvider } from "@/ai/providers";
import { mentorSystemBlocks, promptCanary } from "@/ai/prompts";
import { ImageRejectedError, sanitizeImage, type CleanImage } from "@/ai/guard/image";
import { OutputGuard } from "@/ai/guard/output-filter";
import { classifyTopic, looksLikeInjection, type TopicVerdict } from "@/ai/guard/topic-check";
import { resolveMentorScope, type MentorScope } from "@/ai/mentor/context";
import { loadConversation, summarizeIfNeeded, type DbRunner } from "@/ai/mentor/history";
import { evaluateLimits, globalCostToday, loadLimitSnapshot, shouldBlock, startOfUtcDay, startOfUtcMonth, type LimitReason } from "@/ai/mentor/limits";
import { hashUserId, logUsage, pseudonym, recordSecurityEvent } from "@/ai/mentor/usage";
import type { AiContentBlock, AiMessageParam, AiUsage } from "@/ai/types";
import type { TenantContext } from "@/lib/auth/session";
import { withTenantContext } from "@/lib/db/tenant-context";
import { sendEmail } from "@/lib/email/email-service";
import { getStorage } from "@/lib/storage";

/**
 * POST /api/mentor/chat, as one function. The order of the steps is fixed:
 *
 *   1 authentication   (ids come from the session, never the body)
 *   2 authorisation    (this user, this simulation, this tenant)
 *   3 limits           (rejected before any model is called)
 *   4 input validation (length, image type and size)
 *   5 topic check      (local screen, then the low-cost classifier)
 *   6 context          (built on the server, no personal data)
 *   7 model call       (system and user content in separate blocks, no tools)
 *   8 output check     (canary, secrets, links, images)
 *   9 stream + record  (conversation, usage, security events)
 */

export type MentorLocale = "az" | "en" | "tr";

export interface MentorChatInput {
  simulationId: string;
  message: string;
  image: Uint8Array | null;
  locale: MentorLocale | null;
}

export interface MentorSession {
  id: string;
  role: string;
  tenantId: string | null;
  language: string;
}

export type MentorChatResult =
  | { kind: "error"; status: number; code: string; retryAfterSeconds?: number }
  | { kind: "stream"; body: ReadableStream<Uint8Array> };

const LIMIT_CODES: Record<LimitReason, string> = {
  temporarily_blocked: "AI_TEMPORARILY_BLOCKED",
  too_fast: "AI_TOO_FAST",
  daily_messages: "AI_LIMIT_DAILY_MESSAGES",
  daily_images: "AI_LIMIT_DAILY_IMAGES",
  images_disabled: "AI_IMAGES_DISABLED",
  tenant_budget: "AI_TENANT_BUDGET",
};

const fail = (status: number, code: string, retryAfterSeconds?: number): MentorChatResult => ({
  kind: "error",
  status,
  code,
  ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
});

function languageOf(input: MentorChatInput, session: MentorSession): MentorLocale {
  const lang = input.locale ?? session.language;
  return lang === "az" || lang === "tr" || lang === "en" ? lang : "en";
}

export async function handleMentorChat(params: {
  session: MentorSession;
  context: TenantContext;
  input: MentorChatInput;
  config?: AiConfig;
  now?: Date;
}): Promise<MentorChatResult> {
  const config = params.config ?? loadAiConfig();
  const now = params.now ?? new Date();
  const { session, input } = params;

  // 1. Authentication: identity only from the session.
  if (!config.enabled) return fail(503, "AI_NOT_AVAILABLE");
  if (session.role !== "PARTICIPANT" || !session.tenantId) return fail(403, "AI_FORBIDDEN");
  const tenantId = session.tenantId;
  const userId = session.id;
  const userHash = hashUserId(userId);
  const locale = languageOf(input, session);
  const run: DbRunner = (fn) => withTenantContext(params.context, fn);

  // 2. Authorisation, in code.
  const scope = await run((tx) => resolveMentorScope(tx, { tenantId, userId, simulationId: input.simulationId, locale }));
  if (!scope) return fail(403, "AI_SIMULATION_FORBIDDEN");
  const ids = { tenantId, userHash, simulationId: scope.simulationId };

  // 3. Limits, before anything costs money.
  const globalCost = await globalCostToday(now);
  const snapshot = await run((tx) => loadLimitSnapshot(tx, { tenantId, userId, userHash }, config.limits, now, globalCost));
  const decision = evaluateLimits(snapshot, config.limits, now, input.image !== null);
  if (!decision.ok) {
    await run(async (tx) => {
      await recordSecurityEvent(tx, { ...ids, type: "LIMIT_EXCEEDED", reason: decision.reason });
      if (decision.reason !== "temporarily_blocked" && shouldBlock(snapshot, config.limits)) {
        await recordSecurityEvent(tx, { ...ids, type: "TEMPORARY_BLOCK", reason: "anomaly" });
      }
    });
    if (decision.reason === "tenant_budget") await notifyTenantBudget(tenantId, now);
    return fail(429, LIMIT_CODES[decision.reason], decision.retryAfterSeconds);
  }
  if (decision.restricted) await alertGlobalBudget(globalCost, config, now);

  // 4. Input validation.
  const message = input.message.trim();
  if (!message) return fail(400, "AI_MESSAGE_EMPTY");
  if (message.length > config.limits.maxMessageChars) return fail(400, "AI_MESSAGE_TOO_LONG");
  let image: CleanImage | null = null;
  if (input.image) {
    if (!config.imageStages.has(scope.stageKind)) return fail(400, "AI_IMAGES_NOT_ALLOWED");
    try {
      image = await sanitizeImage(input.image, config.limits.maxImageBytes);
    } catch (error) {
      return fail(400, error instanceof ImageRejectedError ? error.code : "AI_IMAGE_INVALID");
    }
  }
  const imageKey = image ? await storeImage(tenantId, userHash, image) : null;
  const userMessage = await run((tx) =>
    tx.aiMessage.create({
      data: { tenantId, userId, simulationId: scope.simulationId, role: "user", content: message, imageKey },
      select: { id: true },
    })
  );
  const imageBlock: AiContentBlock | null = image ? { type: "image", mediaType: image.mediaType, data: image.bytes.toString("base64") } : null;

  // 5. Topic check: local screen first, the classifier only if that passes.
  const provider = getProvider();
  let verdict: TopicVerdict;
  const localScreen = looksLikeInjection(message);
  if (localScreen) {
    verdict = { onTopic: false, reasonCode: "injection_attempt", conforming: true };
  } else {
    const result = await classifyTopic({
      provider,
      model: config.models.classifier,
      simulationName: scope.simulationName,
      stage: scope.stageLabel,
      message,
      ...(imageBlock ? { image: imageBlock } : {}),
    });
    verdict = result.verdict;
    if (result.unavailable) {
      await run(async (tx) => {
        await tx.aiMessage.update({ where: { id: userMessage.id }, data: { status: "error" } });
        await recordSecurityEvent(tx, { ...ids, type: "PROVIDER_ERROR", reason: "classifier" });
      });
      return fail(503, "AI_NOT_AVAILABLE");
    }
    await run((tx) =>
      logUsage(tx, {
        ...ids,
        purpose: "topic_check",
        model: config.models.classifier,
        usage: result.usage,
        prefilter: !verdict.conforming ? "invalid" : verdict.onTopic ? "on_topic" : "off_topic",
        ...(verdict.onTopic ? {} : { rejectReason: verdict.reasonCode }),
      })
    );
  }

  const t = await getTranslations({ locale, namespace: "mentor" });
  const remaining = decision.remaining;

  if (!verdict.onTopic) {
    const reply = scope.stageTitle ? t("offTopic", { stage: scope.stageTitle }) : t("offTopicNoStage");
    await run(async (tx) => {
      await tx.aiMessage.update({ where: { id: userMessage.id }, data: { status: "off_topic" } });
      await tx.aiMessage.create({
        data: { tenantId, userId, simulationId: scope.simulationId, role: "assistant", content: reply, status: "off_topic" },
      });
      await recordSecurityEvent(tx, {
        ...ids,
        type: verdict.reasonCode === "injection_attempt" ? "INJECTION_SUSPECTED" : "OFF_TOPIC",
        // "local_screen" marks requests that never reached the classifier (no usage row).
        reason: localScreen ? "local_screen" : verdict.conforming ? verdict.reasonCode : "nonconforming_classifier_output",
      });
      if (shouldBlock(snapshot, config.limits)) await recordSecurityEvent(tx, { ...ids, type: "TEMPORARY_BLOCK", reason: "anomaly" });
    });
    return { kind: "stream", body: sseOnce({ remaining, restricted: decision.restricted }, reply, "off_topic") };
  }

  // 6. Context, built here from the platform's own data.
  const conversation = await run((tx) =>
    loadConversation(tx, { tenantId, userId, simulationId: scope.simulationId }, config.historyWindow, userMessage.id)
  );
  const history = conversation.messages;
  const system = mentorSystemBlocks({
    participant: pseudonym(userHash),
    simulation_name: scope.simulationName,
    current_step: scope.stageLabel || "-",
    decisions_summary: scope.decisionsSummary || "-",
    language: locale,
    conversation_summary: conversation.summary ?? "-",
  });
  const current: AiContentBlock[] = [{ type: "text", text: message }];
  if (imageBlock) current.push(imageBlock);
  const messages: AiMessageParam[] = [...history, { role: "user", content: current }];

  // 7–9. Call, check, stream and record.
  const body = streamReply({
    config,
    run,
    ids,
    scope,
    userId,
    system,
    messages,
    maxTokens: decision.restricted ? config.limits.restrictedMaxOutputTokens : config.limits.maxOutputTokens,
    meta: { remaining, restricted: decision.restricted },
    blockedText: t("blocked"),
    errorCode: "AI_PROVIDER_ERROR",
  });
  return { kind: "stream", body };
}

const encoder = new TextEncoder();
const frame = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

function sseOnce(meta: object, text: string, status: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(frame("meta", meta));
      controller.enqueue(frame("delta", { text }));
      controller.enqueue(frame("done", { status }));
      controller.close();
    },
  });
}

function streamReply(p: {
  config: AiConfig;
  run: DbRunner;
  ids: { tenantId: string; userHash: string; simulationId: string };
  scope: MentorScope;
  userId: string;
  system: ReturnType<typeof mentorSystemBlocks>;
  messages: AiMessageParam[];
  maxTokens: number;
  meta: { remaining: number; restricted: boolean };
  blockedText: string;
  errorCode: string;
}): ReadableStream<Uint8Array> {
  const abort = new AbortController();
  const canary = promptCanary();
  const provider = getProvider();

  return new ReadableStream({
    async start(controller) {
      const guard = new OutputGuard(canary);
      let usage: AiUsage | null = null;
      let failed = false;
      controller.enqueue(frame("meta", p.meta));
      try {
        for await (const event of provider.stream({
          model: p.config.models.mentor,
          system: p.system,
          messages: p.messages,
          maxTokens: p.maxTokens,
          signal: abort.signal,
        })) {
          if (event.type === "text") {
            const safe = guard.push(event.text);
            if (safe) controller.enqueue(frame("delta", { text: safe }));
            if (guard.blocked) {
              abort.abort();
              break;
            }
          } else {
            usage = event.usage;
          }
        }
        const tail = guard.finish();
        if (tail) controller.enqueue(frame("delta", { text: tail }));
      } catch {
        // Nothing internal reaches the client: no stack, no provider message.
        failed = !guard.blocked;
      }

      const status = guard.blocked ? "blocked" : failed ? "error" : "ok";
      if (guard.blocked) controller.enqueue(frame("replace", { text: p.blockedText }));
      if (failed) controller.enqueue(frame("error", { code: p.errorCode }));
      controller.enqueue(frame("done", { status }));
      controller.close();

      const content = guard.blocked ? p.blockedText : guard.text.trim();
      await p.run(async (tx) => {
        if (content) {
          await tx.aiMessage.create({
            data: { tenantId: p.ids.tenantId, userId: p.userId, simulationId: p.ids.simulationId, role: "assistant", content, status },
          });
        }
        if (usage) await logUsage(tx, { ...p.ids, purpose: "mentor", model: p.config.models.mentor, usage, prefilter: "on_topic" });
        if (guard.blocked) await recordSecurityEvent(tx, { ...p.ids, type: "CANARY_TRIGGERED" });
        if (guard.redactions.length) {
          await recordSecurityEvent(tx, { ...p.ids, type: "OUTPUT_REDACTED", reason: [...new Set(guard.redactions)].join(",") });
        }
        if (failed) await recordSecurityEvent(tx, { ...p.ids, type: "PROVIDER_ERROR" });
      });

      if (status === "ok") {
        try {
          const summaryUsage = await summarizeIfNeeded({
            run: p.run,
            scope: { tenantId: p.ids.tenantId, userId: p.userId, simulationId: p.ids.simulationId },
            provider,
            model: p.config.models.classifier,
            window: p.config.historyWindow,
            threshold: p.config.summarizeAfter,
            canary,
          });
          if (summaryUsage) {
            await p.run((tx) => logUsage(tx, { ...p.ids, purpose: "summary", model: p.config.models.classifier, usage: summaryUsage }));
          }
        } catch {
          // A failed summary only means the older turns stay unsummarised for now.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });
}

async function storeImage(tenantId: string, userHash: string, image: CleanImage): Promise<string> {
  const ext = image.mediaType === "image/png" ? "png" : image.mediaType === "image/webp" ? "webp" : "jpg";
  // Private storage only; nothing under public/, nothing executable.
  const key = `ai-mentor/${tenantId}/${userHash}/${randomUUID()}.${ext}`;
  await getStorage().put(key, image.bytes, image.mediaType);
  return key;
}

/** Once a month per tenant: tell the organisation's admins the AI budget ran out. */
async function notifyTenantBudget(tenantId: string, now: Date): Promise<void> {
  const ctx: TenantContext = { tenantId, userId: "system:ai-budget", role: "SUPER_ADMIN", isSuperAdmin: true };
  const admins = await withTenantContext(ctx, async (tx) => {
    const already = await tx.tenantNotification.findFirst({
      where: { tenantId, type: "AI_BUDGET_EXHAUSTED", createdAt: { gte: startOfUtcMonth(now) } },
      select: { id: true },
    });
    if (already) return [];
    await tx.tenantNotification.create({ data: { tenantId, type: "AI_BUDGET_EXHAUSTED", payload: JSON.stringify({ month: now.toISOString().slice(0, 7) }) } });
    await recordSecurityEvent(tx, { tenantId, userHash: null, simulationId: null, type: "TENANT_BUDGET_EXHAUSTED" });
    return tx.user.findMany({ where: { tenantId, role: "TENANT_ADMIN" }, select: { email: true, language: true } });
  });
  for (const admin of admins) {
    const lang = admin.language === "az" || admin.language === "tr" ? admin.language : "en";
    const t = await getTranslations({ locale: lang, namespace: "mentor.budgetEmail" });
    await sendEmail({ to: admin.email, subject: t("subject"), html: `<p>${t("body")}</p>`, text: t("body") }).catch(() => undefined);
  }
}

/** Once a day: platform-wide spend passed the ceiling, mentor is in restricted mode. */
async function alertGlobalBudget(cost: number, config: AiConfig, now: Date): Promise<void> {
  const ctx: TenantContext = { tenantId: null, userId: "system:ai-budget", role: "SUPER_ADMIN", isSuperAdmin: true };
  const first = await withTenantContext(ctx, async (tx) => {
    const already = await tx.aiSecurityEvent.findFirst({
      where: { type: "GLOBAL_BUDGET_EXCEEDED", createdAt: { gte: startOfUtcDay(now) } },
      select: { id: true },
    });
    if (already) return false;
    await recordSecurityEvent(tx, { tenantId: null, userHash: null, simulationId: null, type: "GLOBAL_BUDGET_EXCEEDED", reason: `usd=${cost.toFixed(2)}` });
    return true;
  });
  if (first && config.alertEmail) {
    const text = `BizSim AI Mentor: today's AI spend reached $${cost.toFixed(2)} (ceiling $${config.limits.globalDailyUsd}). The mentor is in restricted mode until 00:00 UTC.`;
    await sendEmail({ to: config.alertEmail, subject: "BizSim AI daily spend ceiling reached", html: `<p>${text}</p>`, text }).catch(() => undefined);
  }
}
