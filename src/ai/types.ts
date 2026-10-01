/**
 * The one interface the rest of the platform talks to. Providers translate it
 * to their SDK; nothing outside `ai/providers` imports a provider SDK.
 *
 * There is deliberately no `tools` field: the mentor model is given no
 * functions (database, email, scores), so it can only ever return text.
 */

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type AiContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: ImageMediaType; data: string };

export interface AiMessageParam {
  role: "user" | "assistant";
  content: string | AiContentBlock[];
}

export interface AiSystemBlock {
  text: string;
  /** Mark the stable prefix for the provider's prompt cache. */
  cache?: boolean;
}

export interface AiRequest {
  model: string;
  system: AiSystemBlock[];
  messages: AiMessageParam[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type AiStreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; usage: AiUsage; stopReason: string | null };

export interface AiCompletion {
  text: string;
  usage: AiUsage;
  stopReason: string | null;
}

export interface LlmProvider {
  readonly name: string;
  stream(request: AiRequest): AsyncIterable<AiStreamEvent>;
  complete(request: AiRequest): Promise<AiCompletion>;
}

export const EMPTY_USAGE: AiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
