import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { createSdkProvider } from "@/ai/providers/sdk-provider";
import type { LlmProvider } from "@/ai/types";

/**
 * Amazon Bedrock through its Messages-API (Mantle) endpoint. Credentials
 * resolve through the default AWS chain, so on EC2 the instance role is used
 * and no key is stored anywhere. Region: AI_BEDROCK_REGION, else AWS_REGION.
 */
export function createBedrockProvider(): LlmProvider {
  const client = new AnthropicBedrockMantle({
    awsRegion: process.env.AI_BEDROCK_REGION || undefined,
    maxRetries: 2,
    timeout: 60_000,
  });
  return createSdkProvider("bedrock", client);
}
