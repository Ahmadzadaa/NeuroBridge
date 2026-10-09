import { loadAiConfig } from "@/ai/config";
import { createAnthropicProvider } from "@/ai/providers/anthropic";
import { createBedrockProvider } from "@/ai/providers/bedrock";
import type { LlmProvider } from "@/ai/types";

let provider: LlmProvider | null = null;

/** The configured provider (AI_PROVIDER=anthropic|bedrock), created once. */
export function getProvider(): LlmProvider {
  if (!provider) {
    provider = loadAiConfig().provider === "bedrock" ? createBedrockProvider() : createAnthropicProvider();
  }
  return provider;
}

/** Tests swap in a fake so they can assert the LLM is (or is not) called. */
export function setProviderForTests(fake: LlmProvider | null): void {
  provider = fake;
}
