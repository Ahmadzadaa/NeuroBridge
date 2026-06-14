import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validation/schemas";
import { adminRequires2FA } from "@/lib/security/two-factor";
import type { UserRole } from "@/lib/types";

const prisma = new PrismaClient();

async function testLogin(email: string, password: string) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    console.log(email, "VALIDATION FAIL", parsed.error.flatten());
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    include: { tenant: { select: { status: true } } },
  });

  if (!user) {
    console.log(email, "USER NOT FOUND");
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.log(email, "BAD PASSWORD");
    return;
  }

  const role = user.role as UserRole;
  const demoBypass = true;
  const needs2FASetup = !demoBypass && adminRequires2FA(role) && !user.twoFactorEnabled;
  console.log(email, "LOGIN OK", { role, needs2FASetup });
}

async function main() {
  await testLogin("admin@bizsim.com", "Admin123!");
  await testLogin("tenant@demo-tekno.com", "Admin123!");
  await testLogin("participant@demo.com", "Admin123!");
}

main()
  .finally(() => prisma.$disconnect());
