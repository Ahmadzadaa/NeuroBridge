import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatReportValue } from "@/lib/reports/report-format";
import type { ReportTable, UniversityReport } from "@/lib/reports/university-types";

/**
 * A university report as an A4 landscape PDF: header, KPI tiles, bar charts,
 * then each table, breaking across pages with the header row repeated.
 * Uses the certificate fonts, which carry the Azerbaijani and Turkish letters.
 */

const FONT_ROOT = path.join(process.cwd(), "assets", "certificates", "fonts");
const W = 842;
const H = 595;
const M = 36;
const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.88, 0.89, 0.92);
const ZEBRA = rgb(0.97, 0.97, 0.98);
const SERIES = [rgb(0.31, 0.27, 0.9), rgb(0.05, 0.58, 0.53)];
const TRACK = rgb(0.93, 0.94, 0.96);

/** Typographic characters a subset font may lack, spelled with ones it has. */
const FALLBACK: Record<string, string> = { "—": "-", "–": "-", "·": "|", "…": "...", "“": '"', "”": '"', "’": "'", "‘": "'" };

class Writer {
  page!: PDFPage;
  y = 0;
  private chars: Set<number>;

  constructor(
    readonly pdf: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont
  ) {
    this.chars = new Set(regular.getCharacterSet());
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([W, H]);
    this.y = H - M;
  }

  ensure(height: number) {
    if (this.y - height < M + 14) this.newPage();
  }

  safe(text: string): string {
    return [...text]
      .map((ch) => (this.chars.has(ch.codePointAt(0)!) ? ch : (FALLBACK[ch] ?? (ch.trim() ? "?" : " "))))
      .join("");
  }

  fit(text: string, size: number, width: number, font = this.regular): string {
    let s = this.safe(text);
    if (font.widthOfTextAtSize(s, size) <= width) return s;
    while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > width) s = s.slice(0, -1);
    return `${s.trimEnd()}...`;
  }

  text(text: string, x: number, y: number, size: number, opts: { font?: PDFFont; color?: ReturnType<typeof rgb>; width?: number; align?: "right" } = {}) {
    const font = opts.font ?? this.regular;
    const s = opts.width ? this.fit(text, size, opts.width, font) : this.safe(text);
    const dx = opts.align === "right" && opts.width ? opts.width - font.widthOfTextAtSize(s, size) : 0;
    this.page.drawText(s, { x: x + dx, y, size, font, color: opts.color ?? INK });
  }

  wrap(text: string, size: number, width: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of this.safe(text).split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && this.regular.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  paragraph(text: string, size: number, color = MUTED) {
    for (const line of this.wrap(text, size, W - 2 * M)) {
      this.ensure(size + 4);
      this.text(line, M, this.y - size, size, { color });
      this.y -= size + 4;
    }
  }
}

function drawTable(w: Writer, table: ReportTable, locale: string) {
  const size = 8;
  const rowH = 15;
  const width = W - 2 * M;
  const cells = table.rows.map((row) => table.columns.map((c) => formatReportValue(row[c.key] ?? null, c.kind, locale)));

  // Width by content, capped so one long column cannot squeeze the rest out.
  const natural = table.columns.map((c, i) =>
    Math.min(220, Math.max(w.bold.widthOfTextAtSize(w.safe(c.label), size), ...cells.slice(0, 200).map((r) => w.regular.widthOfTextAtSize(w.safe(r[i]), size))) + 10)
  );
  const total = natural.reduce((a, b) => a + b, 0);
  const widths = natural.map((n) => (n / total) * width);
  const numeric = table.columns.map((c) => c.kind !== "text" && c.kind !== "date");

  const header = () => {
    w.page.drawRectangle({ x: M, y: w.y - rowH, width, height: rowH, color: TRACK });
    let x = M;
    table.columns.forEach((c, i) => {
      w.text(c.label, x + 4, w.y - rowH + 4.5, size, { font: w.bold, width: widths[i] - 8, align: numeric[i] ? "right" : undefined });
      x += widths[i];
    });
    w.y -= rowH;
  };

  w.ensure(40 + rowH * Math.min(3, cells.length + 1));
  w.y -= 8;
  w.text(table.title, M, w.y - 12, 12, { font: w.bold });
  w.y -= 20;
  header();
  if (cells.length === 0) {
    w.text("—", M + 4, w.y - rowH + 4.5, size, { color: MUTED });
    w.y -= rowH;
  }
  cells.forEach((row, r) => {
    if (w.y - rowH < M + 14) {
      w.newPage();
      header();
    }
    if (r % 2 === 1) w.page.drawRectangle({ x: M, y: w.y - rowH, width, height: rowH, color: ZEBRA });
    let x = M;
    row.forEach((value, i) => {
      w.text(value, x + 4, w.y - rowH + 4.5, size, { width: widths[i] - 8, align: numeric[i] ? "right" : undefined });
      x += widths[i];
    });
    w.y -= rowH;
  });
  w.page.drawLine({ start: { x: M, y: w.y }, end: { x: M + width, y: w.y }, thickness: 0.5, color: LINE });
  if (table.note) {
    w.y -= 4;
    w.paragraph(table.note, 8);
  }
  w.y -= 6;
}

export async function renderReportPdf(report: UniversityReport, locale: string, generatedLabel: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(report.title);
  const [regular, bold] = await Promise.all(
    ["Lora-Regular.ttf", "Lora-Bold.ttf"].map(async (f) => pdf.embedFont(await readFile(path.join(FONT_ROOT, f)), { subset: false }))
  );
  const w = new Writer(pdf, regular, bold);

  // Header
  w.text(report.title, M, w.y - 20, 20, { font: bold });
  w.y -= 30;
  w.paragraph(report.description, 10);
  w.paragraph(`${report.scope}  ·  ${generatedLabel}`, 9);
  w.y -= 8;

  // KPI tiles, four to a row.
  const gap = 8;
  const tileW = (W - 2 * M - gap * 3) / 4;
  const tileH = 46;
  report.kpis.forEach((k, i) => {
    if (i % 4 === 0) {
      if (i > 0) w.y -= tileH + gap;
      w.ensure(tileH);
    }
    const x = M + (i % 4) * (tileW + gap);
    w.page.drawRectangle({ x, y: w.y - tileH, width: tileW, height: tileH, borderColor: LINE, borderWidth: 0.75, color: rgb(1, 1, 1) });
    w.text(formatReportValue(k.value, k.kind, locale), x + 10, w.y - 22, 16, { font: bold, width: tileW - 20 });
    w.text(k.label, x + 10, w.y - 37, 8, { color: MUTED, width: tileW - 20 });
  });
  if (report.kpis.length) w.y -= tileH + 14;

  // Bars on a 0–100 scale.
  for (const chart of report.bars) {
    const rows = chart.items.length * chart.series.length;
    w.ensure(30 + Math.min(rows, 10) * 12);
    w.text(chart.title, M, w.y - 12, 12, { font: bold });
    w.y -= 20;
    if (chart.series.length > 1) {
      let x = M;
      chart.series.forEach((s, i) => {
        w.page.drawRectangle({ x, y: w.y - 8, width: 8, height: 8, color: SERIES[i % SERIES.length] });
        w.text(s, x + 12, w.y - 8, 8);
        x += 24 + regular.widthOfTextAtSize(w.safe(s), 8);
      });
      w.y -= 16;
    }
    const labelW = 220;
    const trackW = W - 2 * M - labelW - 50;
    for (const item of chart.items) {
      w.ensure(chart.series.length * 12 + 4);
      w.text(item.label, M, w.y - 9, 8, { width: labelW - 10 });
      item.values.forEach((v, i) => {
        const y = w.y - 10 - i * 11;
        w.page.drawRectangle({ x: M + labelW, y, width: trackW, height: 8, color: TRACK });
        if (v !== null && v > 0) w.page.drawRectangle({ x: M + labelW, y, width: (Math.min(100, v) / 100) * trackW, height: 8, color: SERIES[i % SERIES.length] });
        w.text(formatReportValue(v, "percent", locale).replace("%", ""), M + labelW + trackW + 6, y + 0.5, 8, { color: MUTED });
      });
      w.y -= chart.series.length * 11 + 5;
    }
    w.y -= 8;
  }

  for (const table of report.tables) drawTable(w, table, locale);

  if (report.notes.length) {
    w.y -= 4;
    for (const note of report.notes) w.paragraph(note, 8);
  }

  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const label = `${i + 1} / ${pages.length}`;
    page.drawText(label, { x: W - M - regular.widthOfTextAtSize(label, 8), y: M / 2, size: 8, font: regular, color: MUTED });
    page.drawText(w.safe(report.title), { x: M, y: M / 2, size: 8, font: regular, color: MUTED });
  });

  return pdf.save();
}
