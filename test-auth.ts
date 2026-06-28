import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testAuth() {
  const email = "admin@demo-teknopark.com";
  const password = "Demo123!";

  console.log("🔍 Testing Authentication for:", email);
  
  // Find user
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    include: {
      tenant: { select: { status: true } },
    },
  });

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("✅ User found:", user.email);
  console.log("   Role:", user.role);
  console.log("   Tenant Status:", user.tenant?.status);
  console.log("   2FA Enabled:", user.twoFactorEnabled);
  
  // Check password
  const valid = await bcrypt.compare(password, user.passwordHash);
  console.log("   Password valid:", valid);
  
  // Check tenant status
  if (user.role !== "SUPER_ADMIN") {
    if (!user.tenant || user.tenant.status !== "ACTIVE") {
      console.log("❌ Tenant inactive or missing");
      return;
    }
  }
  
  console.log("✅ All checks passed - user should be able to login");
}

testAuth()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
