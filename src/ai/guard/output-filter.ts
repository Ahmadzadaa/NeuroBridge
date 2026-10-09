/**
 * Server-side checks on everything the model says, applied before a single
 * character reaches the browser.
 *
 * Text is held back until a sentence (or line) ends, then sanitised and sent.
 * That keeps streaming responsive while making sure a pattern is never split
 * across two flushes, and that the canary is seen whole before anything around
 * it goes out. If the canary appears the response is blocked outright.
 */

export type RedactionKind = "markdown_image" | "url" | "email" | "phone" | "secret" | "internal_id";

const RULES: { kind: RedactionKind; re: RegExp; replacement: string }[] = [
  { kind: "markdown_image", re: /!\[[^\]\n]*\]\([^)\n]*\)/g, replacement: "" },
  { kind: "markdown_image", re: /<img\b[^>]*>/gi, replacement: "" },
  { kind: "url", re: /\b(?:https?|ftp|data|javascript):\S+|\bwww\.\S+/gi, replacement: "[link removed]" },
  { kind: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: "[email removed]" },
  {
    kind: "secret",
    re: /\b(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abpr]-[A-Za-z0-9-]{10,})\b|\bBearer\s+[\w.~+/-]{16,}=*/g,
    replacement: "[removed]",
  },
  // Long opaque strings: keys, tokens and signatures of every other shape.
  { kind: "secret", re: /\b(?=[A-Za-z0-9_+/-]*\d)(?=[A-Za-z0-9_+/-]*[A-Za-z])[A-Za-z0-9_+/-]{32,}={0,2}/g, replacement: "[removed]" },
  // Record ids (cuid) of any tenant: the model should never print one.
  { kind: "internal_id", re: /\bc[a-z0-9]{24}\b/g, replacement: "[id removed]" },
  {
    kind: "phone",
    re: /(?:\+\d{1,3}[\s.-]?|\b0)\(?\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    replacement: "[phone removed]",
  },
];

export function sanitizeOutput(text: string): { text: string; redactions: RedactionKind[] } {
  const redactions: RedactionKind[] = [];
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.re, () => {
      redactions.push(rule.kind);
      return rule.replacement;
    });
  }
  return { text: out, redactions };
}

export function containsCanary(text: string, canary: string): boolean {
  return text.toLowerCase().includes(canary.toLowerCase());
}

/** Text that is safe to flush now: everything up to the last sentence or line end. */
function flushPoint(buffer: string, force: boolean): number {
  if (force) return buffer.length;
  let point = -1;
  const re = /[.!?…:;](?=\s)|\n/g;
  for (let m = re.exec(buffer); m; m = re.exec(buffer)) point = m.index + 1;
  // A long run without punctuation still flushes, at the last space.
  if (point < 0 && buffer.length > 300) point = buffer.lastIndexOf(" ");
  return point;
}

export class OutputGuard {
  private raw = "";
  private pending = "";
  private sent = "";
  readonly redactions: RedactionKind[] = [];
  blocked = false;

  constructor(private readonly canary: string) {}

  /** Feed a model chunk; returns the sanitised text that may be sent now. */
  push(chunk: string): string {
    if (this.blocked) return "";
    this.raw += chunk;
    if (containsCanary(this.raw, this.canary)) {
      this.blocked = true;
      return "";
    }
    this.pending += chunk;
    return this.release(false);
  }

  /** End of stream: release whatever is left. */
  finish(): string {
    if (this.blocked) return "";
    return this.release(true);
  }

  /** The full sanitised text that was sent. */
  get text(): string {
    return this.sent;
  }

  private release(force: boolean): string {
    const point = flushPoint(this.pending, force);
    if (point <= 0) return "";
    const ready = this.pending.slice(0, point);
    this.pending = this.pending.slice(point);
    const { text, redactions } = sanitizeOutput(ready);
    this.redactions.push(...redactions);
    this.sent += text;
    return text;
  }
}
