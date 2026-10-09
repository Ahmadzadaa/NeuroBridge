/**
 * Gives the platform super admin a new, long random password and shows it
 * once. Run on the server and keep the password in a password manager:
 *
 *   docker compose exec worker npx tsx scripts/set-admin-password.ts
 *   docker compose exec worker npx tsx scripts/set-admin-password.ts --email you@example.com
 *
 * --email also changes the sign-in address, so password-reset mail reaches you.
 * Nothing is logged or stored besides the bcrypt hash.
 */
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// No look-alike characters (0/O, 1/l/I), so it can be typed from a screen.
const SETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_=+?"];

function strongPassword(length = 24) {
  const all = SETS.join("");
  const chars = SETS.map((set) => set[randomInt(set.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function argValue(name: string) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const email = argValue("--email")?.trim().toLowerCase();
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("--email is not a valid address");
  }

  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true, email: true } });
  if (admins.length !== 1) throw new Error(`Expected one super admin, found ${admins.length}`);
  const admin = admins[0];

  if (email && email !== admin.email && (await prisma.user.findFirst({ where: { email }, select: { id: true } }))) {
    throw new Error(`${email} already belongs to another account`);
  }

  const password = strongPassword();
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      failedLoginAttempts: 0,
      lockedUntil: null,
      ...(email ? { email } : {}),
    },
  });

  console.log(`\nSuper admin: ${email ?? admin.email}`);
  console.log(`New password: ${password}`);
  console.log("Save it in a password manager now; it is not shown again.\n");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
