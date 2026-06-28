import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      tenantId: { not: null }
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      twoFactorEnabled: true
    },
    take: 10
  });

  console.log("📋 Demo Users in Database:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
