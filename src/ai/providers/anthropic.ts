import Anthropic from "@anthropic-ai/sdk";
import { createSdkProvider } from "@/ai/providers/sdk-provider";
import type { LlmProvider } from "@/ai/types";

/** Anthropic API. The key comes from ANTHROPIC_API_KEY, read by the SDK itself. */
export function createAnthropicProvider(): LlmProvider {
  return createSdkProvider("anthropic", new Anthropic({ maxRetries: 2, timeout: 60_000 }));
}
