#!/usr/bin/env node
/**
 * Fails the build when a component asks for a translation key that no locale
 * file defines. A missing key is not a silent fallback in next-intl — it throws
 * at render time, so this is a broken page, not a cosmetic gap.
 *
 * Scoping note: a file may declare several translators (`const t = ...` inside
 * different components). Keys are therefore resolved against every namespace
 * declared in the file, and only reported when they are missing from all of
 * them — otherwise correct code reads as broken.
 *
 * Block comments are stripped before scanning: a doc comment that quotes a
 * call like `t("error")` to explain a change is prose, not code, and reporting
 * it sends the reader looking for a bug that does not exist.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const LOCALES = ["az", "tr", "en"];
const messages = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))])
);

const resolve = (obj, dotted) =>
  dotted.split(".").reduce((cur, part) => (cur && typeof cur === "object" ? cur[part] : undefined), obj);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".ts", ".tsx"].includes(extname(full))) out.push(full);
  }
  return out;
}

const NS_RE = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g;
const problems = [];

// Strips block comments so prose in doc comments is not scanned as code.
const stripBlockComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

for (const file of walk("src")) {
  const src = stripBlockComments(readFileSync(file, "utf8"));
  const namespaces = new Map();
  for (const m of src.matchAll(NS_RE)) {
    if (!namespaces.has(m[1])) namespaces.set(m[1], new Set());
    namespaces.get(m[1]).add(m[2]);
  }
  if (namespaces.size === 0) continue;

  for (const [variable, spaces] of namespaces) {
    const callRe = new RegExp(`(?<![A-Za-z0-9_$.])${variable}\\(\\s*"([a-zA-Z0-9_.]+)"`, "g");
    for (const call of src.matchAll(callRe)) {
      const key = call[1];
      for (const locale of LOCALES) {
        const found = [...spaces].some(
          (ns) => resolve(messages[locale], `${ns}.${key}`) !== undefined
        );
        if (!found) {
          problems.push({ file, key: `${[...spaces].join("|")}.${key}`, locale });
        }
      }
    }
  }
}

if (problems.length === 0) {
  console.log("i18n: bütün açarlar hər üç dildə mövcuddur");
  process.exit(0);
}

console.error(`i18n: ${problems.length} çatışmayan açar\n`);
for (const p of problems) console.error(`  [${p.locale}] ${p.key}\n        ${p.file}`);
process.exit(1);
