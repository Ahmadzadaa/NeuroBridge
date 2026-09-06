/**
 * Certificate templates.
 *
 * Each template pairs a decorative background (exported from the design tool,
 * with every variable text element stripped out) with a set of positioned
 * blocks. Coordinates are in millimetres on a 297 x 210 mm landscape page and
 * were measured directly from the source PDFs, so the generated text lands
 * exactly where the designer put it.
 */

export type BlockKind = "text" | "paragraph";

export interface TemplateBlock {
  /** Key into the render data. */
  key: string;
  kind: BlockKind;
  /** Distance from the top edge of the page to the top of the text, in mm. */
  y: number;
  /** Horizontal centre of the block, in mm. */
  cx: number;
  /** Maximum width before shrinking (text) or wrapping (paragraph), in mm. */
  maxW: number;
  font: FontFamily;
  weight?: 400 | 700;
  /** Cap height in mm — matches the size measured in the source design. */
  size: number;
  /** Shrink down to this size before overflowing. Text blocks only. */
  minSize?: number;
  lineHeight?: number;
  color: string;
  letterSpacing?: number;
  transform?: "uppercase";
  note?: string;
}

export type FontFamily =
  | "PinyonScript"
  | "GreatVibes"
  | "Lora"
  | "Merriweather"
  | "PlayfairDisplay";

export interface CertificateTemplate {
  id: string;
  /**
   * Fallback label. The interface reads the name and the style caption from
   * `tenant.certificates.templates.<id>` in the message files so they follow
   * the viewer's language; these values only show if a key goes missing.
   */
  name: string;
  style: string;
  /** Matches CERTIFICATE_TYPES. */
  type: "PARTICIPATION" | "ACHIEVEMENT" | "COMPLETION";
  background: string;
  page: { w: number; h: number };
  blocks: TemplateBlock[];
  /** Default body copy, per locale. {name} and {program} are substituted. */
  defaultBody: Record<string, string>;
}

export const CERTIFICATE_TEMPLATES: Record<string, CertificateTemplate> = {
  achievement: {
    id: "achievement",
    name: "Certificate of Achievement",
    style: "Gold guilloche pattern",
    type: "ACHIEVEMENT",
    background: "bg_achievement.pdf",
    page: { w: 297, h: 210 },
    blocks: [
      { key: "recipientName", kind: "text", y: 74.4, cx: 148.5, maxW: 170,
        font: "PinyonScript", size: 21.2, minSize: 12, color: "#B08A3E" },
      { key: "body", kind: "paragraph", y: 101.2, cx: 148.5, maxW: 215,
        font: "Lora", size: 5.3, lineHeight: 1.65, color: "#3F3A34" },
      { key: "signature1Name", kind: "text", y: 157.1, cx: 88, maxW: 60,
        font: "PlayfairDisplay", weight: 700, size: 4.5, minSize: 3.2, color: "#2E2A25" },
      { key: "signature1Role", kind: "text", y: 162.9, cx: 88, maxW: 60,
        font: "PlayfairDisplay", size: 3.5, minSize: 2.8, color: "#5A5248" },
      { key: "signature2Name", kind: "text", y: 157.1, cx: 209, maxW: 60,
        font: "PlayfairDisplay", weight: 700, size: 4.5, minSize: 3.2, color: "#2E2A25" },
      { key: "signature2Role", kind: "text", y: 162.9, cx: 209, maxW: 60,
        font: "PlayfairDisplay", size: 3.5, minSize: 2.8, color: "#5A5248" },
    ],
    defaultBody: {
      az: "Bu sertifikat, «{program}» proqramı çərçivəsində göstərdiyi üstün nəticəyə və töhfələrə görə təqdim olunur.",
      tr: "Bu sertifika, «{program}» programı kapsamında gösterdiği üstün başarı ve katkılar nedeniyle sunulmuştur.",
      en: "This certificate is presented in recognition of outstanding achievement and contribution in the «{program}» programme.",
    },
  },

  participation: {
    id: "participation",
    name: "Certificate of Participation",
    style: "Navy and gold",
    type: "PARTICIPATION",
    background: "bg_participation.pdf",
    page: { w: 297, h: 210 },
    blocks: [
      { key: "recipientName", kind: "text", y: 99.2, cx: 159.2, maxW: 150,
        font: "PlayfairDisplay", size: 13.6, minSize: 7, color: "#C9A227",
        transform: "uppercase", letterSpacing: 0.6 },
      { key: "body", kind: "paragraph", y: 121.6, cx: 166.3, maxW: 180,
        font: "Lora", size: 5.2, lineHeight: 1.6, color: "#12315C" },
      { key: "signature1Name", kind: "text", y: 161.6, cx: 121.2, maxW: 50,
        font: "PlayfairDisplay", size: 6, minSize: 3.6, color: "#12315C" },
      { key: "signature1Role", kind: "text", y: 170.9, cx: 121.2, maxW: 50,
        font: "Lora", size: 5.3, minSize: 3.4, color: "#12315C" },
      { key: "signature2Name", kind: "text", y: 162, cx: 211, maxW: 50,
        font: "PlayfairDisplay", size: 6, minSize: 3.6, color: "#12315C" },
      { key: "signature2Role", kind: "text", y: 171.4, cx: 211, maxW: 50,
        font: "Lora", size: 5.3, minSize: 3.4, color: "#12315C" },
    ],
    defaultBody: {
      az: "«{program}» proqramında iştirak edərək öhdəsinə düşən vəzifələri uğurla yerinə yetirmiş və bu sertifikatı almağa hak qazanmışdır.",
      tr: "«{program}» programında görev alarak kendisine verilen sorumlulukları başarıyla yerine getirmiş ve bu sertifikayı almaya hak kazanmıştır.",
      en: "Took part in the «{program}» programme, fulfilled the assigned responsibilities and has earned this certificate of participation.",
    },
  },

  completion: {
    id: "completion",
    name: "Certificate of Completion",
    style: "Cream, with a wax seal",
    type: "COMPLETION",
    background: "bg_completion.pdf",
    page: { w: 297, h: 210 },
    blocks: [
      { key: "issuerName", kind: "text", y: 40.8, cx: 148.5, maxW: 45,
        font: "PlayfairDisplay", size: 5.5, minSize: 3, color: "#6B4423",
        note: "emblemin içindəki təşkilat adı" },
      { key: "recipientName", kind: "text", y: 95.9, cx: 148.5, maxW: 190,
        font: "GreatVibes", size: 21.2, minSize: 12, color: "#1A1A1A" },
      { key: "body", kind: "paragraph", y: 120.3, cx: 148.5, maxW: 175,
        font: "Merriweather", size: 5.3, lineHeight: 1.55, color: "#3B2A1A" },
      { key: "signature1Role", kind: "text", y: 146, cx: 96, maxW: 60,
        font: "Merriweather", weight: 700, size: 5.3, minSize: 3.4, color: "#3B2A1A" },
      { key: "signature1Name", kind: "text", y: 154.9, cx: 96, maxW: 60,
        font: "Merriweather", size: 5.3, minSize: 3.4, color: "#3B2A1A" },
      { key: "signature2Role", kind: "text", y: 146, cx: 201, maxW: 60,
        font: "Merriweather", weight: 700, size: 5.3, minSize: 3.4, color: "#3B2A1A" },
      { key: "signature2Name", kind: "text", y: 154.9, cx: 201, maxW: 60,
        font: "Merriweather", size: 5.3, minSize: 3.4, color: "#3B2A1A" },
    ],
    defaultBody: {
      az: "«{program}» proqramını uğurla tamamlayaraq bu sertifikatı almağa hak qazanmışdır.",
      tr: "«{program}» eğitimini başarıyla tamamlayarak bu sertifikayı almaya hak kazanmıştır.",
      en: "Successfully completed the «{program}» programme and has earned this certificate.",
    },
  },
};

export const TEMPLATE_IDS = Object.keys(CERTIFICATE_TEMPLATES);

export function getTemplate(id: string): CertificateTemplate | null {
  return CERTIFICATE_TEMPLATES[id] ?? null;
}

/** Fill {name} / {program} placeholders. Deliberately suffix-free — Azerbaijani
 *  and Turkish case suffixes depend on the final vowel, and getting them wrong
 *  on a printed certificate looks worse than not using them at all. */
export function fillBody(
  template: string,
  vars: { name: string; program: string }
): string {
  return template
    .replaceAll("{name}", vars.name)
    .replaceAll("{program}", vars.program);
}
