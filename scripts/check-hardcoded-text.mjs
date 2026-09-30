#!/usr/bin/env node
/**
 * Fails the build when a component ships user-visible text as a literal
 * instead of a translation key.
 *
 * The platform serves three languages, and a hardcoded string silently
 * survives every other check: types pass, lint passes, `check-i18n` passes
 * (there is no key to be missing). It only shows up when a speaker of the
 * other two languages opens the page. This script is what catches it.
 *
 * What counts as user-visible: JSX text nodes, the attributes a screen reader
 * or an empty field reads out (placeholder, aria-label, title, alt), and the
 * literal strings handed to a toast or an inline error banner — those never
 * appear in the markup, so the JSX scan alone would miss them.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

/**
 * Files allowed to inline copy, each for a reason that survives review.
 * Adding to this list is a decision, not a formality.
 */
const ALLOWED = new Map([
  [
    "src/app/global-error.tsx",
    "root-layout boundary: no provider has mounted, so it carries its own three-language copy",
  ],
  [
    "src/app/[locale]/error.tsx",
    "error boundary: a missing key throws at render, which is what the boundary exists to prevent",
  ],
  [
    "src/app/[locale]/not-found.tsx",
    "same boundary rule as error.tsx; carries its own three-language copy",
  ],
  [
    "src/components/ui/typography.tsx",
    "sample text lives in the doc comment, not in the rendered output",
  ],
  [
    "src/components/ui/sidebar.tsx",
    "unused shadcn primitive; nothing in the app imports it",
  ],
  [
    "src/app/[locale]/login/page.tsx",
    "demo credential block renders only when NODE_ENV is development",
  ],
]);

/** Literal values that are not prose: sample emails, URLs, identifiers. */
const NOT_PROSE =
  /^(?:[\w.+-]+@[\w.-]+|https?:\/\/\S+|[A-Za-z0-9_-]+\.(?:[a-z]{2,4})|\d[\d\s.,%-]*)$/;

const JSX_TEXT = />\s*([A-Za-z][A-Za-z0-9'’,.\-!?&/() ]{3,80})\s*</g;
const ATTR_TEXT = /\b(placeholder|aria-label|title|alt)="([^"]{3,80})"/g;
/**
 * Text sitting between two JSX expressions, e.g. `{count} seats · {provider}`.
 * The plain text scan cannot see it — there is no `>` in front of it — and this
 * is exactly where units and separators hide.
 *
 * A closing brace that starts its own line is the end of a block, so
 * `} catch {` and `} interface Foo {` are skipped: only a brace with code
 * before it on the same line can be a JSX interpolation.
 */
const BETWEEN_EXPR = /([^\s{}][^\n{}]*)\}\s*([A-Za-z][^\n{}<>"]{2,40}?)\s*[{<]/g;

const NOTIFY_TEXT =
  /\b(?:toast\.(?:error|success|info|warning|message)|setError|setMessage|setStatusText)\(\s*"([^"]{4,120})"/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__") walk(full, out);
    } else if (extname(full) === ".tsx" && !full.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

const problems = [];

for (const file of walk("src")) {
  // ALLOWED is keyed with forward slashes, but relative() yields backslashes
  // on Windows — without normalising, every allowlist entry misses there and
  // the check fails locally while still passing in CI.
  const rel = relative(".", file).split(sep).join("/");
  if (ALLOWED.has(rel)) continue;

  const src = readFileSync(file, "utf8");
  const found = new Set();

  for (const m of src.matchAll(JSX_TEXT)) {
    const text = m[1].trim();
    if (/[A-Za-z]{2}/.test(text) && !NOT_PROSE.test(text)) found.add(text);
  }
  for (const m of src.matchAll(ATTR_TEXT)) {
    const text = m[2].trim();
    if (/[A-Za-z]{3}/.test(text) && !NOT_PROSE.test(text)) {
      found.add(`${m[1]}="${text}"`);
    }
  }
  for (const m of src.matchAll(BETWEEN_EXPR)) {
    const text = m[2].trim();
    const prose = /^[A-Za-z][A-Za-z .,:·/%()'-]*$/.test(text) && /[A-Za-z]{3}/.test(text);
    if (prose && !NOT_PROSE.test(text)) {
      found.add(`between expressions: "${text}"`);
    }
  }
  for (const m of src.matchAll(NOTIFY_TEXT)) {
    const text = m[1].trim();
    if (/[A-Za-z]{3}/.test(text) && !NOT_PROSE.test(text)) {
      found.add(`toast/error: "${text}"`);
    }
  }

  for (const text of found) problems.push({ file: rel, text });
}

if (problems.length === 0) {
  console.log("i18n: tərcümə olunmamış mətn tapılmadı");
  process.exit(0);
}

console.error(
  `i18n: ${problems.length} sabit mətn tapıldı — bunlar üç dilə tərcümə olunmur\n`,
);
for (const p of problems) console.error(`  ${p.file}\n        ${p.text}`);
console.error(
  "\nHər birini messages/az|tr|en.json-a açar kimi köçürün və useTranslations ilə oxuyun.",
);
process.exit(1);
