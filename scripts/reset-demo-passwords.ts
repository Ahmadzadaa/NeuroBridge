import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertNotProduction } from "../prisma/dev-only";

assertNotProduction("reset-demo-passwords");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const emails = [
    "admin@bizsim.com",
    "tenant@demo-tekno.com",
    "participant@demo.com",
  ];

  for (const email of emails) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.log("missing:", email);
      continue;
    }
    await prisma.userRecoveryCode.deleteMany({ where: { userId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log("reset:", email);
  }
}

main()
  .finally(() => prisma.$disconnect());
