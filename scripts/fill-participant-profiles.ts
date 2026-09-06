/**
 * Backfills phone numbers and academic profiles onto participants that have
 * none.
 *
 * A full `db:seed-demo:reset` would do the same thing, but it also recreates
 * every user, which invalidates open sessions and throws away certificates
 * already issued. This script touches only the empty profile columns.
 *
 *   npm run db:fill-profiles
 */
import { PrismaClient } from "@prisma/client";
import { participantProfile } from "../prisma/participant-profiles";

const prisma = new PrismaClient();

async function main() {
  const participants = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    select: { id: true, language: true, university: true, phone: true },
    orderBy: { email: "asc" },
  });

  let filled = 0;
  for (let i = 0; i < participants.length; i++) {
    const user = participants[i];
    // Never overwrite something a real person entered.
    if (user.university && user.phone) continue;

    const profile = participantProfile(i, user.language ?? "az");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: user.phone ?? profile.phone,
        university: user.university ?? profile.university,
        faculty: profile.faculty,
        specialty: profile.specialty,
        studyYear: profile.studyYear,
      },
    });
    filled += 1;
  }

  console.log(
    `🎓 ${filled} / ${participants.length} participant profiles filled.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
