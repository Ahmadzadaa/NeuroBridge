import { existsSync, readFileSync, writeFileSync } from "fs";
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

/**
 * The spec spreadsheets live outside the repo (docs/spec). Each import from
 * them refreshes a JSON snapshot that is committed, so a server — which has
 * no spreadsheets — imports the same lists from the snapshot.
 */
const SNAPSHOT = "prisma/seed-data/academic-lists.json";
type Lists = { universities: { rows: Row[]; skipped: number }; departments: { rows: Row[]; skipped: number } };

function loadLists(): Lists {
  if (existsSync(UNIVERSITY_FILE) && existsSync(DEPARTMENT_FILE)) {
    const lists = {
      universities: readRows(UNIVERSITY_FILE, [/universite/, /university/], [/^il$/, /sehir/, /city/]),
      departments: readRows(DEPARTMENT_FILE, [/bolum/, /department/], [/^alan$/, /field/]),
    };
    writeFileSync(
      SNAPSHOT,
      JSON.stringify({ universities: lists.universities.rows, departments: lists.departments.rows }, null, 2) + "\n"
    );
    return lists;
  }
  if (!existsSync(SNAPSHOT)) throw new Error(`Neither the spec files nor ${SNAPSHOT} were found`);
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as { universities: Row[]; departments: Row[] };
  return {
    universities: { rows: snapshot.universities, skipped: 0 },
    departments: { rows: snapshot.departments, skipped: 0 },
  };
}

async function importUniversities({ rows, skipped }: Lists["universities"]) {
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

async function importDepartments({ rows, skipped }: Lists["departments"]) {
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
  const lists = loadLists();
  const universities = await importUniversities(lists.universities);
  const departments = await importDepartments(lists.departments);
  console.log("universities:", universities);
  console.log("departments: ", departments);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
