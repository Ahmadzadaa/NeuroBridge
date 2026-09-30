import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";

/**
 * Alphabet without the characters people misread when copying a code off a
 * printed page or dictating it over the phone: 0/O, 1/I/L, 5/S, 2/Z.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRTUVWXY346789";
const CODE_LENGTH = 10;

/** Unguessable public lookup key for a certificate. */
export function generateVerifyCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** Three-letter tenant tag for the serial, derived from the organisation name. */
export function tenantCode(tenantName: string): string {
  const letters = tenantName
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-ZÇĞİÖŞÜƏ]/g, "")
    .replace(/[ÇĞİÖŞÜƏ]/g, (c) => ({ Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U", Ə: "E" })[c] ?? c);
  return (letters.slice(0, 3) || "ORG").padEnd(3, "X");
}

/**
 * Reserves the next serial for a tenant, inside the caller's transaction.
 *
 * `increment` is applied by the database, so two bulk issues running at the
 * same time cannot mint the same number — which matters, because the serial is
 * the human-facing identity of a document people will quote back to us.
 */
export async function nextSerialNumber(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; tenantName: string; year?: number }
): Promise<string> {
  const year = params.year ?? new Date().getFullYear();

  const sequence = await tx.certificateSequence.upsert({
    where: { tenantId_year: { tenantId: params.tenantId, year } },
    create: { tenantId: params.tenantId, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });

  const counter = String(sequence.lastValue).padStart(6, "0");
  return `BIZ-${year}-${tenantCode(params.tenantName)}-${counter}`;
}
