import { existsSync } from "fs";
import { describe, expect, it } from "vitest";
import { parseIdeaDevDocument } from "@/lib/training/idea-dev-parser";
import { readDocxParagraphs } from "../../../../scripts/lib/office-zip";

const B = "  "; // the literal bullet character used in the source document

function question(n: number, correct = "B", d = "Dördüncü seçenek.") {
  return [
    `${n}. Soru ${n} metni?`,
    `A) Birinci seçenek.\nB) İkinci seçenek.\nC) Üçüncü seçenek.\nD) ${d}`,
    `Doğru cevap: ${correct}`,
  ];
}

const tenQuestions = (last?: string[]) => [
  ...Array.from({ length: 9 }, (_, i) => question(i + 1)).flat(),
  ...(last ?? question(10)),
];

const doc = [
  "01 — FİKİR GELİŞTİRME SİMÜLASYONU",
  "Bu simülasyon için seçilebilir eğitimler:",
  "1. YARATICI DÜŞÜNCE",
  "2.PROBLEM KEŞFİ",
  "Bunlar için video eklenecek.",
  // Unit 1: full markers
  "1. YARATICI DÜŞÜNCE",
  "🎯 Uygulama / Proje Soru Havuzu",
  "Bir mahallede insanlar birbirlerini tanımıyor.",
  `${B}Teknoloji yasak olsaydı ne yapardın?`,
  `${B}Hiç paran olmasaydı?`,
  "📝 Test ve Sorular",
  ...tenQuestions(),
  // Unit 2: no 📝 marker, a caption line, and a cut-off option
  "2. PROBLEM KEŞFİ",
  "6. Problem:\nBir parkta kimse oturmuyor.",
  "Burada özellikle fikir çeşitliliğini ölçelim:",
  `${B}En az 5 problem düşün.`,
  ...tenQuestions(question(10, "C", "Rakiplerinden daha iyi olduğunu söyle")),
];

describe("parseIdeaDevDocument", () => {
  const { units, warnings } = parseIdeaDevDocument(doc);

  it("finds each unit by its title, ignoring the table of contents", () => {
    expect(units.map((u) => [u.order, u.title])).toEqual([
      [1, "YARATICI DÜŞÜNCE"],
      [2, "PROBLEM KEŞFİ"],
    ]);
  });

  it("splits the project into scenario and bullet tasks, dropping captions and markers", () => {
    expect(units[0].project).toEqual({
      scenario: "Bir mahallede insanlar birbirlerini tanımıyor.",
      tasks: ["Teknoloji yasak olsaydı ne yapardın?", "Hiç paran olmasaydı?"],
    });
    expect(units[1].project.scenario).toBe("Bir parkta kimse oturmuyor.");
    expect(units[1].project.tasks).toEqual(["En az 5 problem düşün."]);
  });

  it("parses ten A–D questions with the answer key, with or without the 📝 marker", () => {
    for (const unit of units) expect(unit.questions).toHaveLength(10);
    expect(units[0].questions[0]).toEqual({
      number: 1,
      text: "Soru 1 metni?",
      options: { A: "Birinci seçenek.", B: "İkinci seçenek.", C: "Üçüncü seçenek.", D: "Dördüncü seçenek." },
      correct: "B",
    });
    expect(units[1].questions[9].correct).toBe("C");
  });

  it("keeps a possibly truncated option as is and warns instead of inventing text", () => {
    expect(units[1].questions[9].options.D).toBe("Rakiplerinden daha iyi olduğunu söyle");
    expect(warnings).toEqual([
      'Unit 2 Q10: option D may be truncated: "Rakiplerinden daha iyi olduğunu söyle"',
    ]);
  });

  it("skips a question with missing options and says so", () => {
    const broken = [...doc.slice(0, 11), "1. Tek seçenekli soru?", "A) Sadece bu", "Doğru cevap: A", ...question(2)];
    const result = parseIdeaDevDocument(broken);
    expect(result.units[0].questions.map((q) => q.number)).toEqual([2]);
    expect(result.warnings).toContain("Unit 1 Q1: fewer than four options (A–D) — skipped");
  });
});

const SPEC = "docs/spec/Fikir_Gelistirme_Test_ve_Sorular.docx";

describe.skipIf(!existsSync(SPEC))("the spec document", () => {
  it("yields 8 units of 10 questions with a valid answer key", () => {
    const { units } = parseIdeaDevDocument(readDocxParagraphs(SPEC));
    expect(units).toHaveLength(8);
    for (const u of units) {
      expect(u.questions).toHaveLength(10);
      expect(u.project.tasks.length).toBeGreaterThan(0);
      for (const q of u.questions) expect(q.options[q.correct]).toBeTruthy();
    }
  });
});
