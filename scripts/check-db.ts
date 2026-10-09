import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { tenant: { select: { status: true, name: true } } },
  });
  for (const u of users) {
    const ok = await bcrypt.compare("Admin123!", u.passwordHash);
    console.log({
      email: u.email,
      role: u.role,
      tenantStatus: u.tenant?.status ?? "n/a",
      twoFactorEnabled: u.twoFactorEnabled,
      lockedUntil: u.lockedUntil,
      passwordOk: ok,
    });
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
