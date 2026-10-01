import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { withTenantContext } from "@/lib/db/tenant-context";
import { loadAiConfig } from "@/ai/config";
import { handleMentorChat } from "@/ai/mentor/service";
import { resolveMentorScope } from "@/ai/mentor/context";
import { loadTranscript } from "@/ai/mentor/history";
import { remainingToday, startOfUtcDay } from "@/ai/mentor/limits";

/**
 * AI Mentor chat. user_id and tenant_id come from the session only; the body
 * carries nothing but the message, the simulation and an optional image.
 */

const chatFieldsSchema = z.object({
  simulation_id: z.string().cuid(),
  message: z.string().max(10_000),
  locale: z.enum(["az", "en", "tr"]).optional(),
});

function errorResponse(status: number, code: string, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: "Request not accepted", code },
    { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined }
  );
}

export async function POST(request: Request) {
  const config = loadAiConfig();
  // Requests larger than an image plus a message are refused before parsing.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > config.limits.maxImageBytes + 64_000) return errorResponse(413, "AI_IMAGE_TOO_LARGE");

  return withAuthorizedHandler(
    "ai:use",
    async ({ session, context }) => {
      await enforceRateLimit("ai", `ip:${getClientIdentifier(request)}`);
      await enforceRateLimit("ai", `user:${session.id}`);
      await enforceRateLimit("aiTenant", `tenant:${session.tenantId}`);
      await assertFeatureEnabled(session.tenantId, "aiTools");

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return errorResponse(400, "AI_BAD_REQUEST");
      }
      const fields = chatFieldsSchema.safeParse({
        simulation_id: form.get("simulation_id"),
        message: form.get("message") ?? "",
        locale: form.get("locale") || undefined,
      });
      if (!fields.success) return errorResponse(400, "AI_BAD_REQUEST");

      const file = form.get("image");
      let image: Uint8Array | null = null;
      if (file instanceof File && file.size > 0) {
        if (file.size > config.limits.maxImageBytes) return errorResponse(400, "AI_IMAGE_TOO_LARGE");
        image = new Uint8Array(await file.arrayBuffer());
      }

      const result = await handleMentorChat({
        session: { id: session.id, role: session.role, tenantId: session.tenantId, language: session.language },
        context,
        config,
        input: {
          simulationId: fields.data.simulation_id,
          message: fields.data.message,
          image,
          locale: fields.data.locale ?? null,
        },
      });
      if (result.kind === "error") return errorResponse(result.status, result.code, result.retryAfterSeconds);

      return new Response(result.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          "X-Accel-Buffering": "no",
          "X-Content-Type-Options": "nosniff",
        },
      });
    },
    { requireTenant: true }
  );
}

/** Panel state for one simulation: the participant's own transcript and counters. */
export async function GET(request: Request) {
  return withAuthorizedHandler(
    "ai:use",
    async ({ session, context }) => {
      const config = loadAiConfig();
      const simulationId = new URL(request.url).searchParams.get("simulation_id") ?? "";
      if (!z.string().cuid().safeParse(simulationId).success) return errorResponse(400, "AI_BAD_REQUEST");
      if (session.role !== "PARTICIPANT" || !session.tenantId) return errorResponse(403, "AI_FORBIDDEN");
      await assertFeatureEnabled(session.tenantId, "aiTools");
      const tenantId = session.tenantId;

      const state = await withTenantContext(context, async (tx) => {
        const scope = await resolveMentorScope(tx, { tenantId, userId: session.id, simulationId, locale: session.language });
        if (!scope) return null;
        const own = { tenantId, userId: session.id };
        const [transcript, remaining, imagesToday] = await Promise.all([
          loadTranscript(tx, { ...own, simulationId }),
          remainingToday(tx, own, config.limits),
          tx.aiMessage.count({ where: { ...own, role: "user", imageKey: { not: null }, createdAt: { gte: startOfUtcDay(new Date()) } } }),
        ]);
        return {
          enabled: config.enabled,
          transcript,
          remaining,
          dailyLimit: config.limits.dailyMessages,
          maxChars: config.limits.maxMessageChars,
          imagesAllowed: config.imageStages.has(scope.stageKind),
          imagesRemaining: Math.max(0, config.limits.dailyImages - imagesToday),
        };
      });
      if (!state) return errorResponse(403, "AI_SIMULATION_FORBIDDEN");
      return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
    },
    { requireTenant: true }
  );
}
