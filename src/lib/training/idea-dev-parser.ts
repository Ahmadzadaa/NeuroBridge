/**
 * Parses the "Fikir Geliştirme Simülasyonu — Test ve Sorular" document
 * (docs/spec) into training units. Pure: takes the document's paragraphs and
 * returns data plus warnings, so it is testable without the .docx.
 *
 * The source is hand-formatted and inconsistent (some units lack the 🎯/📝
 * markers, bullets are literal U+F0B7 characters), so the parser keys on the
 * things every unit does have: a known title, and questions that end in
 * "Doğru cevap: X". It never fills in missing text — gaps become warnings.
 */

export type ParsedQuestion = {
  number: number;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
};

export type ParsedUnit = {
  order: number;
  title: string;
  project: { scenario: string; tasks: string[] };
  questions: ParsedQuestion[];
};

export type ParseResult = { units: ParsedUnit[]; warnings: string[] };

const BULLET = /^[•●▪◦-]\s*/;
const ANSWER = /^Doğru cevap\s*:\s*([A-D])\s*$/i;
const MARKER = /^(🎯|📝)/u;
const OPTION_SPLIT = /(?:^|\n)\s*([A-D])\)\s*/;

const normalizeTitle = (s: string) =>
  s
    .replace(/^\d+\.\s*/, "")
    .toLocaleUpperCase("tr")
    .replace(/\s+/g, " ")
    .trim();

/** Titles come from the numbered list at the top of the document. */
function findTitles(paragraphs: string[]): string[] {
  const titles: string[] = [];
  for (const p of paragraphs) {
    const m = /^(\d+)\.\s*(.+)$/.exec(p);
    if (!m) {
      if (titles.length > 0) break;
      continue;
    }
    if (Number(m[1]) !== titles.length + 1) break;
    titles.push(normalizeTitle(p));
  }
  return titles;
}

function parseOptions(text: string): ParsedQuestion["options"] | null {
  const parts = text.split(OPTION_SPLIT);
  // ["", "A", "…", "B", "…", …]
  const options: Partial<ParsedQuestion["options"]> = {};
  for (let i = 1; i < parts.length; i += 2) {
    options[parts[i] as "A" | "B" | "C" | "D"] = parts[i + 1].replace(/\s+/g, " ").trim();
  }
  return options.A !== undefined && options.B !== undefined && options.C !== undefined && options.D !== undefined
    ? (options as ParsedQuestion["options"])
    : null;
}

export function parseIdeaDevDocument(paragraphs: string[]): ParseResult {
  const warnings: string[] = [];
  const titles = findTitles(paragraphs);
  if (titles.length === 0) return { units: [], warnings: ["No unit list found at the top of the document"] };

  // Unit headings: paragraphs whose normalized text is exactly a known title,
  // skipping the table of contents at the top.
  const tocEnd = paragraphs.findIndex((p) => normalizeTitle(p) === titles[titles.length - 1]);
  const starts: number[] = [];
  for (let i = tocEnd + 1; i < paragraphs.length && starts.length < titles.length; i++) {
    if (normalizeTitle(paragraphs[i]) === titles[starts.length]) starts.push(i);
  }
  if (starts.length !== titles.length) {
    warnings.push(`Found ${starts.length} of ${titles.length} unit headings`);
  }

  const units = starts.map((start, u): ParsedUnit => {
    const end = starts[u + 1] ?? paragraphs.length;
    const block = paragraphs.slice(start + 1, end);
    const label = `Unit ${u + 1}`;

    const answerIdx = block.flatMap((p, i) => (ANSWER.test(p) ? [i] : []));
    // Question 1 starts at the last "1." paragraph before the first answer.
    let q1 = -1;
    for (let i = (answerIdx[0] ?? 0) - 1; i >= 0; i--) {
      if (/^1[.)]\s/.test(block[i])) {
        q1 = i;
        break;
      }
    }
    if (answerIdx.length > 0 && q1 < 0) warnings.push(`${label}: could not find where question 1 starts`);

    // Project brief: everything before the questions, minus markers and
    // "Label:" lines (section captions such as "Ana Problem:").
    const projectPart = block.slice(0, q1 < 0 ? block.length : q1);
    const tasks: string[] = [];
    const scenario: string[] = [];
    for (const p of projectPart) {
      if (MARKER.test(p)) continue;
      if (BULLET.test(p)) tasks.push(p.replace(BULLET, "").trim());
      else if (/:\s*$/.test(p)) {
        const next = projectPart[projectPart.indexOf(p) + 1];
        if (/problem/i.test(p) && (!next || MARKER.test(next) || BULLET.test(next))) {
          warnings.push(`${label}: "${p}" heading has no problem text under it`);
        }
      } else {
        // A paragraph can carry its own caption line ("6. Problem:" + line break).
        const text = p
          .split("\n")
          .filter((line) => !/^(\d+\.\s*)?[^.!?]{0,40}:\s*$/.test(line.trim()))
          .join("\n")
          .trim();
        if (text) scenario.push(text);
      }
    }
    if (tasks.length === 0) warnings.push(`${label}: no project tasks found`);

    const questions: ParsedQuestion[] = [];
    answerIdx.forEach((a, n) => {
      const from = n === 0 ? q1 : answerIdx[n - 1] + 1;
      if (from < 0) return;
      const chunk = block.slice(from, a).filter((p) => !MARKER.test(p));
      const optionAt = chunk.findIndex((p) => /(^|\n)\s*A\)/.test(p));
      if (optionAt < 0) {
        warnings.push(`${label} Q${n + 1}: no options found — skipped`);
        return;
      }
      const numbered = /^(\d+)[.)]\s*/.exec(chunk[0]);
      const number = numbered ? Number(numbered[1]) : n + 1;
      if (number !== n + 1) warnings.push(`${label}: question numbered ${number} found in position ${n + 1}`);

      const options = parseOptions(chunk.slice(optionAt).join("\n"));
      if (!options) {
        warnings.push(`${label} Q${number}: fewer than four options (A–D) — skipped`);
        return;
      }
      // An option without closing punctuation next to siblings that all have
      // it is likely cut off in the export. Keep the text as is; flag it.
      const ends = (s: string) => /[.?!…)"”]$/.test(s);
      const letters = ["A", "B", "C", "D"] as const;
      const punctuated = letters.filter((l) => ends(options[l])).length;
      for (const l of letters) {
        if (!options[l]) warnings.push(`${label} Q${number}: option ${l} is empty`);
        else if (punctuated >= 3 && !ends(options[l])) {
          warnings.push(`${label} Q${number}: option ${l} may be truncated: "${options[l]}"`);
        }
      }

      questions.push({
        number,
        text: chunk
          .slice(0, optionAt)
          .join(" ")
          .replace(/^\d+[.)]\s*/, "")
          .replace(/\s+/g, " ")
          .trim(),
        options,
        correct: ANSWER.exec(block[a])![1].toUpperCase() as ParsedQuestion["correct"],
      });
    });
    if (questions.length !== 10) warnings.push(`${label}: ${questions.length} questions (expected 10)`);

    return {
      order: u + 1,
      title: titles[u],
      project: { scenario: scenario.join("\n"), tasks },
      questions,
    };
  });

  return { units, warnings };
}
