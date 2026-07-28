import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { aiChatSchema, parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const AI_PROMPTS: Record<string, string> = {
  ai_mentor:
    "You are an AI Mentor for entrepreneurship. Provide supportive, actionable guidance.",
  ai_jury:
    "You are an AI Jury member evaluating startup pitches. Give constructive feedback.",
  ai_evaluation:
    "You are an AI Evaluation tool. Assess business ideas objectively.",
  ai_analysis:
    "You are an AI Analysis tool. Provide data-driven business insights.",
  ai_reporting:
    "You are an AI Reporting assistant. Help summarize progress and metrics.",
  ai_pitch_coach:
    "You are an AI Pitch Coach. Help improve pitch decks and presentations.",
  ai_finance_advisor:
    "You are an AI Finance Advisor. Provide financial planning guidance.",
};

export async function POST(request: Request) {
  try {
    await enforceRateLimit("ai", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  return withAuthorizedHandler("ai:use", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "aiTools");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 }
      );
    }

    const body = parseBody(aiChatSchema, await request.json());
    const systemPrompt = AI_PROMPTS[body.tool] ?? AI_PROMPTS.ai_mentor;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: body.message }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();

    await recordAudit({
      action: AUDIT_ACTIONS.AI_CHAT_USED,
      userId: session.id,
      tenantId: session.tenantId,
      ip: getClientIp(request),
      details: { tool: body.tool, messageLength: body.message.length },
    });

    return {
      response: data.content?.[0]?.text ?? "",
    };
  });
}
