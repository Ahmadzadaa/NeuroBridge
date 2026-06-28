import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      email: "admin@demo-teknopark.com"
    },
    select: {
      email: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true
    }
  });

  if (!admin) {
    console.log("❌ Admin user not found");
    return;
  }

  console.log("📋 Admin User:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   2FA Enabled: ${admin.twoFactorEnabled}`);
  console.log(`   2FA Secret: ${admin.twoFactorSecret}`);
  
  // Test password verification
  const testPassword = "Demo123!";
  const isValid = await bcrypt.compare(testPassword, admin.passwordHash);
  console.log(`   Password "Demo123!" valid: ${isValid}`);
  
  // Test with different passwords
  const testPassword2 = "Demo123";
  const isValid2 = await bcrypt.compare(testPassword2, admin.passwordHash);
  console.log(`   Password "Demo123" valid: ${isValid2}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
