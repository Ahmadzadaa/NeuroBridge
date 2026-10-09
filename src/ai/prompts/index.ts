import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { AiSystemBlock } from "@/ai/types";

/**
 * System prompts live as Markdown next to this file, one per tool (mentor
 * today; jury, pitch coach and finance advisor later). They are treated as
 * public: no keys, URLs or pricing logic belong in them.
 */

export type PromptName = "mentor" | "topic-check" | "summary";

const PROMPT_DIR = path.join(process.cwd(), "src", "ai", "prompts");
const cache = new Map<PromptName, string>();

export function loadPrompt(name: PromptName): string {
  let text = cache.get(name);
  if (text === undefined) {
    text = readFileSync(path.join(PROMPT_DIR, `${name}.md`), "utf8").replace(/\r\n/g, "\n");
    cache.set(name, text);
  }
  return text;
}

/**
 * The canary: a random word placed in the prompt that must never appear in
 * output. Seeing it means the prompt is being leaked, so the response is
 * blocked. Random per process unless pinned with AI_PROMPT_CANARY.
 */
const CANARY = process.env.AI_PROMPT_CANARY || `zephyr${randomBytes(6).toString("hex")}`;

export function promptCanary(): string {
  return CANARY;
}

/** Context values are platform data, so they are flattened and capped before going in. */
export function cleanValue(value: string, max = 600): string {
  const flat = value
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]+/g, " ")
    .replace(/\{\{|\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function renderPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => cleanValue(values[key] ?? ""));
}

export interface MentorPromptValues {
  participant: string;
  simulation_name: string;
  current_step: string;
  decisions_summary: string;
  language: string;
  conversation_summary: string;
}

/**
 * The mentor prompt as two system blocks: the fixed rules first, marked for
 * the prompt cache, then the per-request CONTEXT section. Keeping the rules
 * byte-identical across requests is what lets the provider reuse the cache.
 */
export function mentorSystemBlocks(values: MentorPromptValues): AiSystemBlock[] {
  const template = loadPrompt("mentor");
  const split = template.indexOf("\nCONTEXT\n");
  const rules = renderPrompt(template.slice(0, split), { canary: CANARY });
  const context = renderPrompt(template.slice(split + 1), { ...values });
  return [
    { text: rules.trim(), cache: true },
    { text: context.trim() },
  ];
}
