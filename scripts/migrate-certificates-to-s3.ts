import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { resolveCertificateKey } from "../src/lib/certificates/storage";
import { certificateKey } from "../src/lib/storage/keys";
import { LOCAL_ROOT } from "../src/lib/storage/local-adapter";
import { activeDriver, getStorage } from "../src/lib/storage";

/**
 * Copies certificate PDFs off the local filesystem into the configured
 * storage driver, and rewrites `Certificate.pdfPath` to the new key layout
 * (`certificates/{tenantId}/{userId}/{certificateId}.pdf`).
 *
 * Idempotent: a row whose path is already in the new layout and whose object
 * is present is skipped, so the script can be re-run after a partial failure
 * or a second batch of certificates.
 *
 * It never deletes the local original. If the upload turns out to be wrong,
 * the source is still there to re-run from.
 *
 *   npx tsx scripts/migrate-certificates-to-s3.ts --dry-run
 *   npx tsx scripts/migrate-certificates-to-s3.ts
 */

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;

interface Counters {
  migrated: number;
  skippedAlready: number;
  skippedMissingFile: number;
  skippedHashMismatch: number;
  failed: number;
}

async function migrateOne(
  row: {
    id: string;
    tenantId: string;
    userId: string;
    pdfPath: string;
    pdfHash: string | null;
    serialNumber: string;
  },
  counters: Counters,
): Promise<void> {
  const storage = getStorage();
  const targetKey = certificateKey(row.tenantId, row.userId, row.id);

  if (row.pdfPath === targetKey && (await storage.exists(targetKey))) {
    counters.skippedAlready++;
    return;
  }

  // Always read the original from local disk: the whole point of this script
  // is that the bytes are still only there.
  const source = path.join(LOCAL_ROOT, resolveCertificateKey(row.pdfPath));

  let bytes: Buffer;
  try {
    bytes = await readFile(source);
  } catch {
    // Expected for rows issued before an earlier deploy wiped the container,
    // and for seeded rows that never had a document.
    console.warn(`  ⚠️  ${row.serialNumber}: local file missing (${source})`);
    counters.skippedMissingFile++;
    return;
  }

  // The hash was recorded at issue time; a mismatch means the file on disk is
  // not the document that was issued. Copying it would launder a corrupted
  // file into permanent storage, so it is left for a human.
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (row.pdfHash && row.pdfHash !== hash) {
    console.warn(
      `  ⚠️  ${row.serialNumber}: sha256 mismatch — not migrated (expected ${row.pdfHash.slice(0, 12)}…, found ${hash.slice(0, 12)}…)`,
    );
    counters.skippedHashMismatch++;
    return;
  }

  if (DRY_RUN) {
    console.log(`  → ${row.serialNumber}: ${row.pdfPath} → ${targetKey}`);
    counters.migrated++;
    return;
  }

  try {
    await storage.put(targetKey, bytes, "application/pdf");
    // Written only after the object is durably stored: if the process dies
    // between the two, the row still points at something readable and the
    // next run repeats the copy.
    await prisma.certificate.update({
      where: { id: row.id },
      data: { pdfPath: targetKey, pdfHash: hash },
    });
    counters.migrated++;
  } catch (error) {
    console.error(
      `  ✗ ${row.serialNumber}: ${error instanceof Error ? error.message : String(error)}`,
    );
    counters.failed++;
  }
}

async function main(): Promise<void> {
  const driver = activeDriver();
  console.log(
    `Certificate storage migration → driver="${driver}"${DRY_RUN ? " (dry run)" : ""}`,
  );
  if (driver === "s3" && !process.env.S3_DOCUMENTS_BUCKET) {
    throw new Error("STORAGE_DRIVER=s3 but S3_DOCUMENTS_BUCKET is not set");
  }

  const counters: Counters = {
    migrated: 0,
    skippedAlready: 0,
    skippedMissingFile: 0,
    skippedHashMismatch: 0,
    failed: 0,
  };

  // Cursor paging: the table can hold every certificate the platform ever
  // issued, and loading it whole is exactly the memory problem being fixed.
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.certificate.findMany({
      where: { pdfPath: { not: null } },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        pdfPath: true,
        pdfHash: true,
        serialNumber: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      await migrateOne({ ...row, pdfPath: row.pdfPath! }, counters);
    }
  }

  console.log(
    [
      "",
      `  migrated:              ${counters.migrated}`,
      `  already in place:      ${counters.skippedAlready}`,
      `  local file missing:    ${counters.skippedMissingFile}`,
      `  sha256 mismatch:       ${counters.skippedHashMismatch}`,
      `  failed:                ${counters.failed}`,
    ].join("\n"),
  );

  if (counters.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
