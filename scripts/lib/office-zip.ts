import { readFileSync } from "fs";
import { inflateRawSync } from "zlib";

/**
 * Minimal, dependency-free readers for Office files (xlsx/docx are ZIP
 * archives of XML). Only what the spec import scripts need: reading entries
 * and the first worksheet's cell text.
 */

export function readZipEntries(path: string): Map<string, Buffer> {
  const buf = readFileSync(path);
  // End of central directory: scan back past an optional archive comment.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${path} is not a ZIP/Office file`);

  const entries = new Map<string, Buffer>();
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${path}: corrupt central directory`);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
    const raw = buf.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, raw);
    else if (method === 8) entries.set(name, inflateRawSync(raw));
    else throw new Error(`${path}: unsupported compression ${method} for ${name}`);

    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Joins the <t> runs of a rich-text node, ignoring phonetic hints. */
function textRuns(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return decodeXml([...withoutPhonetic.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
}

function columnIndex(ref: string): number {
  let index = 0;
  for (const ch of ref.replace(/\d+$/, "")) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

/** Rows of the first worksheet as trimmed strings (empty cells are ""). */
export function readFirstSheet(path: string): string[][] {
  const entries = readZipEntries(path);
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textRuns(m[1]));

  const sheetName = [...entries.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  if (!sheetName) throw new Error(`${path}: no worksheet found`);
  const sheet = entries.get(sheetName)!.toString("utf8");

  const rows: string[][] = [];
  for (const [, rowXml] of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const [, attrs, body = ""] of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      const text =
        type === "s" ? (shared[Number(value)] ?? "")
        : type === "inlineStr" ? textRuns(body)
        : decodeXml(value);
      row[columnIndex(ref)] = text.trim();
    }
    rows.push(Array.from(row, (cell) => cell ?? ""));
  }
  return rows;
}

/** Paragraphs of a docx as plain text; table cells are separated by " | ". */
export function readDocxParagraphs(path: string): string[] {
  const xml = readZipEntries(path).get("word/document.xml")?.toString("utf8");
  if (!xml) throw new Error(`${path}: no word/document.xml`);
  const withBreaks = xml
    .replace(/<w:tab\/>/g, "<w:t>\t</w:t>")
    .replace(/<w:br\/>/g, "<w:t>\n</w:t>")
    .replace(/<\/w:tc>/g, "<w:t> | </w:t></w:tc>");
  return [...withBreaks.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)]
    .map((m) => textRuns(m[1].replace(/<w:t\b/g, "<t").replace(/<\/w:t>/g, "</t>")).trim())
    .filter(Boolean);
}
