import { existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { readFirstSheet } from "./lib/office-zip";

/**
 * Imports the platform-wide university and department lists from the spec
 * spreadsheets into `universities` / `departments` (rows with no tenant).
 * Idempotent: matches existing rows by name (case/diacritic-insensitive),
 * creates what is missing, updates city/field, never deletes.
 *
 *   npx tsx scripts/import-universities.ts [universities.xlsx] [departments.xlsx]
 */

const prisma = new PrismaClient();

const UNIVERSITY_FILE = process.argv[2] ?? "docs/spec/Universite_Listesi.xlsx";
const DEPARTMENT_FILE = process.argv[3] ?? "docs/spec/Bolum_Listesi.xlsx";

/** "Çukurova Üniversitesi" and "cukurova universitesi" are the same key. */
const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();

/** Finds a column by header text, so column order in the sheet does not matter. */
function column(header: string[], file: string, patterns: RegExp[], required: boolean): number {
  const index = header.findIndex((h) => patterns.some((p) => p.test(normalize(h))));
  if (index < 0 && required) {
    throw new Error(`${file}: no column matching ${patterns.join(" or ")} (headers: ${header.join(", ")})`);
  }
  return index;
}

type Row = { name: string; extra: string | null };

function readRows(file: string, namePatterns: RegExp[], extraPatterns: RegExp[]): { rows: Row[]; skipped: number } {
  if (!existsSync(file)) throw new Error(`${file} not found — place the spec files in docs/spec/`);
  const [header = [], ...body] = readFirstSheet(file);
  const nameCol = column(header, file, namePatterns, true);
  const extraCol = column(header, file, extraPatterns, false);

  const seen = new Set<string>();
  const rows: Row[] = [];
  let skipped = 0;
  for (const cells of body) {
    const name = cells[nameCol]?.trim();
    if (!name || seen.has(normalize(name))) {
      skipped++;
      continue;
    }
    seen.add(normalize(name));
    rows.push({ name, extra: extraCol >= 0 ? cells[extraCol]?.trim() || null : null });
  }
  return { rows, skipped };
}

async function importUniversities() {
  const { rows, skipped } = readRows(UNIVERSITY_FILE, [/universite/, /university/], [/^il$/, /sehir/, /city/]);
  const existing = await prisma.university.findMany({ where: { tenantId: null } });
  const byKey = new Map(existing.map((u) => [normalize(u.name), u]));

  let created = 0;
  let updated = 0;
  for (const { name, extra: city } of rows) {
    const match = byKey.get(normalize(name));
    if (!match) {
      await prisma.university.create({ data: { name, city, country: "TR" } });
      created++;
    } else if (match.city !== city) {
      await prisma.university.update({ where: { id: match.id }, data: { city } });
      updated++;
    }
  }
  return { read: rows.length, created, updated, skipped };
}

async function importDepartments() {
  const { rows, skipped } = readRows(DEPARTMENT_FILE, [/bolum/, /department/], [/^alan$/, /field/]);
  const existing = await prisma.department.findMany({ where: { tenantId: null } });
  const byKey = new Map(existing.map((d) => [normalize(d.name), d]));

  let created = 0;
  let updated = 0;
  for (const { name, extra: field } of rows) {
    const match = byKey.get(normalize(name));
    if (!match) {
      await prisma.department.create({ data: { name, field } });
      created++;
    } else if (match.field !== field) {
      await prisma.department.update({ where: { id: match.id }, data: { field } });
      updated++;
    }
  }
  return { read: rows.length, created, updated, skipped };
}

async function main() {
  const universities = await importUniversities();
  const departments = await importDepartments();
  console.log("universities:", universities);
  console.log("departments: ", departments);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
