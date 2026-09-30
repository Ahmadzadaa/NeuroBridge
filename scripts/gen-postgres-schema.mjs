#!/usr/bin/env node
/**
 * Writes a PostgreSQL variant of the Prisma schema.
 *
 * Local development runs on SQLite (no Docker required), production runs on
 * PostgreSQL. Prisma will not take the datasource provider from an env var, so
 * the two cannot share one file. The integration tests need the real database:
 * `lockTenantForUpdate` and `registerParticipant` take a raw `SELECT … FOR
 * UPDATE` path on PostgreSQL and a plain read on SQLite, and only the
 * PostgreSQL branch protects seat licensing from overselling under concurrency.
 * Testing solely on SQLite exercises the branch that never ships.
 *
 * This generates the PostgreSQL schema from the SQLite one by swapping only the
 * provider, so the models stay a single source of truth.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "prisma/schema.prisma";
const TARGET = "prisma/schema.postgres.prisma";

const source = readFileSync(SOURCE, "utf8");

if (!/provider\s*=\s*"sqlite"/.test(source)) {
  console.error(
    `${SOURCE} no longer declares the sqlite provider — update this script before trusting its output.`
  );
  process.exit(1);
}

const generated = source.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"sqlite"/,
  '$1"postgresql"'
);

writeFileSync(
  TARGET,
  `// GENERATED FILE — do not edit.\n` +
    `// Produced from ${SOURCE} by scripts/gen-postgres-schema.mjs.\n` +
    `// Edit the models in ${SOURCE}; only the datasource provider differs here.\n\n` +
    generated
);

console.log(`${TARGET} yazıldı (provider: postgresql)`);
