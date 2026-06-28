import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { name: "Demo Teknopark" },
    include: {
      programs: true,
      users: { select: { role: true, email: true, language: true } },
    },
  });

  if (!tenant) {
    console.log("No demo tenant found");
    return;
  }

  const programId = tenant.programs[0]?.id;
  const participants = await prisma.participant.count({
    where: { programId },
  });
  const participantUsers = tenant.users.filter((u) => u.role === "PARTICIPANT");
  const langs = participantUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.language] = (acc[u.language] ?? 0) + 1;
    return acc;
  }, {});

  const inactiveCutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const inactive = await prisma.participant.count({
    where: {
      programId,
      lastLogin: { lt: inactiveCutoff },
    },
  });

  const champion = await prisma.user.findFirst({
    where: {
      email: "ahmet.yilmaz0@demo.com",
      tenantId: tenant.id,
    },
    include: {
      userBadges: true,
      certificates: true,
      examAttempts: true,
      coinTransactions: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        tenant: tenant.name,
        seatLimit: tenant.seatLimit,
        seatsUsed: tenant.seatsUsed,
        planType: tenant.planType,
        programs: tenant.programs.length,
        adminUsers: tenant.users.filter((u) => u.role !== "PARTICIPANT").length,
        participants,
        languageDistribution: langs,
        inactiveParticipants: inactive,
        lessons: await prisma.lesson.count(),
        exams: await prisma.exam.count(),
        questions: await prisma.question.count(),
        simulationTasks: await prisma.simulationTask.count(),
        examAttempts: await prisma.examAttempt.count(),
        certificates: await prisma.certificate.count(),
        userBadges: await prisma.userBadge.count(),
        sampleChampion: champion
          ? {
              email: champion.email,
              badges: champion.userBadges.length,
              certificates: champion.certificates.length,
              examAttempts: champion.examAttempts.length,
              coinBalance: champion.coinBalance,
              coinTransactions: champion.coinTransactions.reduce(
                (sum, t) => sum + t.amount,
                0
              ),
            }
          : null,
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
