import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 500;

function escapeCsv(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportProgramReportCsv(programId: string, tenantId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, tenantId },
    select: { id: true, name: true },
  });

  if (!program) {
    throw new Error("Program not found");
  }

  const headers = [
    "Program",
    "Participant Email",
    "First Name",
    "Last Name",
    "Phone",
    "University",
    "Faculty",
    "Specialty",
    "Study Year",
    "Status",
    "Registration Date",
    "Coin Balance",
  ];

  const rows: string[] = [];
  let cursor: string | undefined;
  let rowCount = 0;

  while (true) {
    const batch = await prisma.participant.findMany({
      where: { programId },
      select: {
        id: true,
        status: true,
        registrationDate: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            university: true,
            faculty: true,
            specialty: true,
            studyYear: true,
            coinBalance: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (batch.length === 0) break;

    for (const p of batch) {
      rows.push(
        [
          program.name,
          p.user.email,
          p.user.firstName,
          p.user.lastName,
          p.user.phone,
          p.user.university,
          p.user.faculty,
          p.user.specialty,
          p.user.studyYear,
          p.status,
          p.registrationDate.toISOString(),
          p.user.coinBalance,
        ]
          .map(escapeCsv)
          .join(",")
      );
      rowCount += 1;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) break;
  }

  return {
    filename: `${program.name.replace(/[^a-z0-9-_]/gi, "_")}_report.csv`,
    content: [headers.join(","), ...rows].join("\n"),
    rowCount,
  };
}
