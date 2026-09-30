import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { readDocxParagraphs } from "./lib/office-zip";
import { parseIdeaDevDocument } from "../src/lib/training/idea-dev-parser";

/**
 * Parses docs/spec/Fikir_Gelistirme_Test_ve_Sorular.docx into seed data for
 * the Idea Development training units (prisma/seed-data/idea-development.json).
 * Prints a count summary and any source problems; never invents missing text.
 *
 *   npx tsx scripts/import-idea-dev-questions.ts [input.docx] [output.json]
 */

const input = process.argv[2] ?? "docs/spec/Fikir_Gelistirme_Test_ve_Sorular.docx";
const output = process.argv[3] ?? "prisma/seed-data/idea-development.json";

const { units, warnings } = parseIdeaDevDocument(readDocxParagraphs(input));

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ source: input, units }, null, 2) + "\n");

const questions = units.reduce((n, u) => n + u.questions.length, 0);
const tasks = units.reduce((n, u) => n + u.project.tasks.length, 0);
console.log(`units: ${units.length} · project tasks: ${tasks} · questions: ${questions} → ${output}`);
for (const u of units) {
  console.log(`  ${u.order}. ${u.title} — ${u.project.tasks.length} tasks, ${u.questions.length} questions`);
}
for (const w of warnings) console.warn(`WARNING ${w}`);
if (units.length === 0) process.exitCode = 1;
