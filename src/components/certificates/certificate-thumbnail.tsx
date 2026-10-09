"use client";

import { useLayoutEffect, useRef } from "react";
import { CERTIFICATE_TEMPLATES, type CertificateTemplate, type TemplateBlock } from "@/lib/certificates/templates";
import { cn } from "@/lib/utils";

/**
 * An on-screen likeness of a certificate: the template's real background
 * (rendered once from its PDF into /certificates/thumbs) with the name, and
 * the organisation where the design has room for it, placed by the same
 * millimetre coordinates and typefaces the PDF renderer uses. It scales with
 * its box, so it matches the issued document at any size.
 */

const TEMPLATE_BY_TYPE: Record<string, string> = {
  ACHIEVEMENT: "achievement",
  PARTICIPATION: "participation",
  COMPLETION: "completion",
};

const FONT_FAMILY: Record<TemplateBlock["font"], string> = {
  PinyonScript: '"Cert PinyonScript", cursive',
  GreatVibes: '"Cert GreatVibes", cursive',
  PlayfairDisplay: '"Cert PlayfairDisplay", Georgia, serif',
  Lora: '"Cert Lora", Georgia, serif',
  Merriweather: '"Cert Merriweather", Georgia, serif',
};

export function templateFor(templateId: string | null | undefined, type: string): CertificateTemplate {
  return CERTIFICATE_TEMPLATES[templateId ?? ""] ?? CERTIFICATE_TEMPLATES[TEMPLATE_BY_TYPE[type] ?? "achievement"];
}

/** One line of the certificate, positioned like the PDF and shrunk the same way when it is too long. */
function Line({ block, value, page }: { block: TemplateBlock; value: string; page: CertificateTemplate["page"] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const unit = 100 / page.w; // 1 mm in cqw (the box is the page's width)

  // Like the renderer: start at the design size and step down to minSize until it fits maxW.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.parentElement?.getBoundingClientRect().width ?? 0;
    if (!box) return;
    const pxPerMm = box / page.w;
    let size = block.size;
    el.style.fontSize = `${size * unit}cqw`;
    while (el.scrollWidth > block.maxW * pxPerMm && size > (block.minSize ?? block.size)) {
      size = Math.max(block.minSize ?? block.size, size - 0.5);
      el.style.fontSize = `${size * unit}cqw`;
    }
  }, [value, block, page.w, unit]);

  return (
    <span
      ref={ref}
      className="absolute whitespace-nowrap leading-none"
      style={{
        top: `${(block.y / page.h) * 100}%`,
        left: `${(block.cx / page.w) * 100}%`,
        transform: "translateX(-50%)",
        fontFamily: FONT_FAMILY[block.font],
        fontWeight: block.weight ?? 400,
        fontSize: `${block.size * unit}cqw`,
        color: block.color,
        letterSpacing: block.letterSpacing ? `${block.letterSpacing * unit}cqw` : undefined,
      }}
    >
      {block.transform === "uppercase" ? value.toLocaleUpperCase("tr-TR") : value}
    </span>
  );
}

/** The wording: wrapped within the block's width and centred, as the renderer does. */
function Paragraph({ block, value, page }: { block: TemplateBlock; value: string; page: CertificateTemplate["page"] }) {
  const unit = 100 / page.w;
  return (
    <p
      className="absolute m-0 text-center"
      style={{
        top: `${(block.y / page.h) * 100}%`,
        left: `${(block.cx / page.w) * 100}%`,
        width: `${block.maxW * unit}cqw`,
        transform: "translateX(-50%)",
        fontFamily: FONT_FAMILY[block.font],
        fontSize: `${block.size * unit}cqw`,
        lineHeight: block.lineHeight ?? 1.5,
        color: block.color,
      }}
    >
      {value}
    </p>
  );
}

export function CertificateThumbnail({
  templateId,
  type,
  recipient,
  issuer,
  body,
  revoked,
  className,
}: {
  templateId?: string | null;
  type: string;
  recipient: string;
  /** The organisation, for designs that print it (the completion emblem). */
  issuer?: string;
  /** The wording printed on it, with the name and programme already filled in. */
  body?: string;
  revoked?: boolean;
  className?: string;
}) {
  const template = templateFor(templateId, type);
  const values: Record<string, string | undefined> = { recipientName: recipient, issuerName: issuer, body };
  const blocks = template.blocks.filter((b) => values[b.key]);

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-white [container-type:inline-size]", revoked && "grayscale opacity-60", className)}
      style={{ aspectRatio: `${template.page.w} / ${template.page.h}` }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/certificates/thumbs/${template.id}.jpg`} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      {blocks.map((block) =>
        block.kind === "paragraph" ? (
          <Paragraph key={block.key} block={block} value={values[block.key]!} page={template.page} />
        ) : (
          <Line key={block.key} block={block} value={values[block.key]!} page={template.page} />
        )
      )}
    </div>
  );
}
