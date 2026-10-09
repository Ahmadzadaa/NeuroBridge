import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CertificateTemplate, FontFamily, TemplateBlock } from "./templates";

const ASSET_ROOT = path.join(process.cwd(), "assets", "certificates");
const FONT_ROOT = path.join(ASSET_ROOT, "fonts");

const MM_TO_PT = 72 / 25.4;
const mm = (value: number) => value * MM_TO_PT;

export interface CertificateRenderData {
  recipientName: string;
  body: string;
  issuerName?: string;
  signature1Name?: string;
  signature1Role?: string;
  signature2Name?: string;
  signature2Role?: string;
  [key: string]: string | undefined;
}

function hexToRgb(hex: string) {
  const value = parseInt(hex.replace("#", ""), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function trackedWidth(font: PDFFont, text: string, size: number, tracking: number) {
  return font.widthOfTextAtSize(text, size) + tracking * Math.max(0, text.length - 1);
}

/** Largest size not exceeding the design size that still fits maxW. */
function fitSize(font: PDFFont, text: string, block: TemplateBlock) {
  const max = mm(block.maxW);
  const tracking = mm(block.letterSpacing ?? 0);
  const min = mm(block.minSize ?? block.size);
  let size = mm(block.size);
  while (size > min && trackedWidth(font, text, size, tracking) > max) {
    size -= 0.25;
  }
  return size;
}

function wrapLines(font: PDFFont, text: string, size: number, maxWmm: number) {
  const max = mm(maxWmm);
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > max) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  cxMm: number,
  baseline: number,
  color: ReturnType<typeof rgb>,
  trackingMm = 0
) {
  if (!trackingMm) {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: mm(cxMm) - width / 2, y: baseline, size, font, color });
    return;
  }
  const tracking = mm(trackingMm);
  let x = mm(cxMm) - trackedWidth(font, text, size, tracking) / 2;
  for (const char of text) {
    page.drawText(char, { x, y: baseline, size, font, color });
    x += font.widthOfTextAtSize(char, size) + tracking;
  }
}

/**
 * Draw a certificate: decorative background from the template, variable text
 * on top. Returns the PDF bytes. Typical run is 150–400 ms, so this is safe to
 * call inline for a preview and from the queue worker for bulk issuance.
 */
export async function renderCertificatePdf(
  template: CertificateTemplate,
  data: CertificateRenderData
): Promise<Uint8Array> {
  const pageHeight = mm(template.page.h);
  const pageWidth = mm(template.page.w);

  const backgroundBytes = await readFile(path.join(ASSET_ROOT, template.background));

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const [background] = await pdf.embedPdf(backgroundBytes, [0]);
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawPage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  const fontCache = new Map<string, PDFFont>();
  const loadFont = async (family: FontFamily, weight?: 400 | 700) => {
    const file = `${family}-${weight === 700 ? "Bold" : "Regular"}.ttf`;
    const cached = fontCache.get(file);
    if (cached) return cached;
    // subset:false is deliberate. pdf-lib's subsetter drops glyphs from these
    // fonts and the text renders half-empty; the fonts are pre-subset on disk
    // to Latin + Azerbaijani/Turkish instead, so the files stay small.
    const embedded = await pdf.embedFont(await readFile(path.join(FONT_ROOT, file)), {
      subset: false,
    });
    fontCache.set(file, embedded);
    return embedded;
  };

  await drawBlocks(page, template, data, pageHeight, loadFont);

  return pdf.save();
}

type FontLoader = (family: FontFamily, weight?: 400 | 700) => Promise<PDFFont>;

async function drawBlocks(
  page: PDFPage,
  template: CertificateTemplate,
  data: CertificateRenderData,
  pageHeight: number,
  loadFont: FontLoader
) {
  for (const block of template.blocks) {
    const raw = data[block.key];
    if (!raw) continue;
    const value = block.transform === "uppercase" ? raw.toLocaleUpperCase("tr-TR") : raw;

    const font = await loadFont(block.font, block.weight);
    const color = hexToRgb(block.color);

    if (block.kind === "paragraph") {
      const size = mm(block.size);
      const leading = size * (block.lineHeight ?? 1.5);
      let baseline = pageHeight - mm(block.y) - size * 0.8;
      for (const line of wrapLines(font, value, size, block.maxW)) {
        drawCentered(page, font, line, size, block.cx, baseline, color);
        baseline -= leading;
      }
    } else {
      const size = fitSize(font, value, block);
      const baseline = pageHeight - mm(block.y) - size * 0.8;
      drawCentered(page, font, value, size, block.cx, baseline, color, block.letterSpacing ?? 0);
    }
  }
}

/**
 * Render one page per recipient into a single document.
 *
 * The background and the fonts are embedded once and reused across every page.
 * That is the whole point: 30 separate documents weigh ~15 MB because each one
 * carries its own copy of the decorative background, while 30 pages in one
 * document weigh well under a megabyte and render in about a second.
 */
export async function renderCertificateBatchPdf(
  template: CertificateTemplate,
  recipients: CertificateRenderData[]
): Promise<Uint8Array> {
  const pageHeight = mm(template.page.h);
  const pageWidth = mm(template.page.w);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const backgroundBytes = await readFile(path.join(ASSET_ROOT, template.background));
  const [background] = await pdf.embedPdf(backgroundBytes, [0]);

  const fontCache = new Map<string, PDFFont>();
  const loadFont = async (family: FontFamily, weight?: 400 | 700) => {
    const file = `${family}-${weight === 700 ? "Bold" : "Regular"}.ttf`;
    const cached = fontCache.get(file);
    if (cached) return cached;
    const embedded = await pdf.embedFont(await readFile(path.join(FONT_ROOT, file)), {
      subset: false,
    });
    fontCache.set(file, embedded);
    return embedded;
  };
  for (const block of template.blocks) await loadFont(block.font, block.weight);

  for (const data of recipients) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawPage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    await drawBlocks(page, template, data, pageHeight, loadFont);
  }

  return pdf.save();
}

