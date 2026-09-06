import { AlertTriangle } from "lucide-react";

/**
 * Shared shell for the privacy policy and the terms of service.
 *
 * Both are skeletons: the headings are the ones a KVKK/GDPR review expects to
 * find, and each body is a placeholder until counsel supplies the wording. The
 * draft notice is deliberately loud — a legal page that looks finished but is
 * not is worse than an obviously empty one.
 */
export function LegalDocument({
  title,
  updatedLabel,
  draftNotice,
  sections,
}: {
  title: string;
  updatedLabel: string;
  draftNotice: string;
  sections: { id: string; heading: string; body: string }[];
}) {
  return (
    <div className="mx-auto min-w-0 max-w-3xl">
      <h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.5px] break-words text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-[13px] text-muted-foreground">{updatedLabel}</p>

      <p className="mt-6 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-[13px] leading-[1.7] text-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        {draftNotice}
      </p>

      {/* A short index: these documents are long, and people arrive looking
          for one clause rather than to read them start to finish. */}
      <nav className="mt-8 rounded-2xl bg-subtle/50 p-5">
        <ol className="space-y-1.5">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="break-words text-[14px] text-muted-foreground hover:text-foreground"
              >
                {index + 1}. {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-8">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="break-words text-[19px] font-semibold text-foreground">
              {index + 1}. {section.heading}
            </h2>
            <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-[1.8] text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
