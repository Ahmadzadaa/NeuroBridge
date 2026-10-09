import type Anthropic from "@anthropic-ai/sdk";
import type { AiCompletion, AiRequest, AiStreamEvent, AiUsage, LlmProvider } from "@/ai/types";

/**
 * Both the Anthropic API and Bedrock (Mantle) clients expose the same Messages
 * surface, so one adapter serves both; only client construction differs.
 */
type MessagesClient = Pick<Anthropic, "messages">;

function toParams(request: AiRequest): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.system.map((block) => ({
      type: "text" as const,
      text: block.text,
      ...(block.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
    })),
    messages: request.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : m.content.map((block) =>
              block.type === "text"
                ? { type: "text" as const, text: block.text }
                : {
                    type: "image" as const,
                    source: { type: "base64" as const, media_type: block.mediaType, data: block.data },
                  }
            ),
    })),
  };
}

function toUsage(usage: Anthropic.Usage): AiUsage {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

function textOf(message: Anthropic.Message): string {
  return message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

export function createSdkProvider(name: string, client: MessagesClient): LlmProvider {
  return {
    name,
    async *stream(request: AiRequest): AsyncIterable<AiStreamEvent> {
      const stream = client.messages.stream(toParams(request), { signal: request.signal });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        }
      }
      const final = await stream.finalMessage();
      yield { type: "done", usage: toUsage(final.usage), stopReason: final.stop_reason };
    },
    async complete(request: AiRequest): Promise<AiCompletion> {
      const message = await client.messages.create(toParams(request), { signal: request.signal });
      return { text: textOf(message), usage: toUsage(message.usage), stopReason: message.stop_reason };
    },
  };
}
