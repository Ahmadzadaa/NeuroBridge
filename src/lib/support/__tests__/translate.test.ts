import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ supportMessage: { findUnique: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { setProviderForTests } from "@/ai/providers";
import type { LlmProvider } from "@/ai/types";
import { translateMessage, translationPrompt } from "@/lib/support/translate";

const admin = { id: "u1", role: "TENANT_ADMIN", tenantId: "t1" };
const message = (translations: string | null = null) => ({ body: "Salam, loqo görünmür.", translations, ticket: { tenantId: "t1" } });
const fake = (text: string) => ({ name: "fake", complete: vi.fn().mockResolvedValue({ text, usage: {}, stopReason: "end_turn" }), stream: vi.fn() }) as unknown as LlmProvider & { complete: ReturnType<typeof vi.fn> };

describe("translateMessage", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => setProviderForTests(null));

  it("translates once and keeps the result on the message", async () => {
    const provider = fake("Hi, the logo does not show.");
    setProviderForTests(provider);
    db.supportMessage.findUnique.mockResolvedValue(message());
    expect(await translateMessage(admin, "m1", "en")).toEqual({ text: "Hi, the logo does not show.", cached: false });
    expect(db.supportMessage.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { translations: JSON.stringify({ en: "Hi, the logo does not show." }) } });
    // The message goes in as data, fenced off from the instructions.
    expect(provider.complete.mock.calls[0][0].messages[0].content).toContain("<message>");

    db.supportMessage.findUnique.mockResolvedValue(message(JSON.stringify({ en: "Hi, the logo does not show." })));
    expect(await translateMessage(admin, "m1", "en")).toEqual({ text: "Hi, the logo does not show.", cached: true });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("keeps one organisation out of another's messages", async () => {
    db.supportMessage.findUnique.mockResolvedValue(message());
    await expect(translateMessage({ ...admin, tenantId: "t2" }, "m1", "en")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("reports the AI being down as unavailable, not as an error page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setProviderForTests({ name: "down", complete: vi.fn().mockRejectedValue(new Error("no key")), stream: vi.fn() } as unknown as LlmProvider);
    db.supportMessage.findUnique.mockResolvedValue(message());
    await expect(translateMessage(admin, "m1", "tr")).rejects.toMatchObject({ statusCode: 503, code: "TRANSLATION_UNAVAILABLE" });
    expect(db.supportMessage.update).not.toHaveBeenCalled();
  });

  it("tells the model the text is data, in the target language", () => {
    expect(translationPrompt("tr")).toMatch(/Turkish/);
    expect(translationPrompt("tr")).toMatch(/not instructions/);
  });
});
