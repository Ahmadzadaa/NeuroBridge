/**
 * Add-on demo seed: hackathon program with teams, jury users, criteria,
 * sample PDF submissions and scores. Also points demo lesson videos at
 * real educational talks. Idempotent — safe to re-run.
 *
 *   npx tsx prisma/seed-hackathon.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const prisma = new PrismaClient();

const DEMO_TENANT_NAME = "Demo Teknopark";
const HACKATHON_TOKEN = "demo-hackathon-2026-token";
const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "submissions");

/** Real, embeddable talks per demo training key (lessons cycle through). */
const TRAINING_VIDEOS: Record<string, string[]> = {
  finance_training: ["https://www.youtube.com/embed/bNpx7gpSqbY"],
  sales_marketing_training: ["https://www.youtube.com/embed/qp0HIF3SfI4"],
  pitch_preparation_training: ["https://www.youtube.com/embed/arj7oStGLkU"],
  business_model_training: ["https://www.youtube.com/embed/H14bBuluwB8"],
};

const CRITERIA = [
  { name: "İnnovasiya və Orijinallıq", maxScore: 10, weight: 3 },
  { name: "Texniki İcra", maxScore: 10, weight: 3 },
  { name: "Biznes Modeli", maxScore: 10, weight: 2 },
  { name: "Təqdimat Keyfiyyəti", maxScore: 10, weight: 2 },
];

const TEAMS = [
  {
    name: "CodeCrafters",
    slogan: "Kod ilə gələcəyi qururuq",
    project: {
      title: "AI Mentor Platforması",
      summary:
        "Tələbələr üçün fərdiləşdirilmiş süni intellekt mentoru — öyrənmə planı, sual-cavab və karyera tövsiyələri bir platformada.",
    },
    scores: [
      [9, 8, 7, 9],
      [8, 9, 8, 8],
    ],
  },
  {
    name: "NeoVentures",
    slogan: "Cəsarətli ideyalar, real nəticələr",
    project: {
      title: "SmartAgro — Ağıllı Əkinçilik",
      summary:
        "IoT sensorları və peyk görüntüləri ilə fermerlərə suvarma və gübrələmə üzrə real vaxt tövsiyələri verən sistem.",
    },
    scores: [[7, 8, 9, 7]],
  },
  {
    name: "GreenMind",
    slogan: "Dayanıqlı düşün, yaşıl qur",
    project: {
      title: "EcoTrack — Karbon İzi Monitoru",
      summary:
        "Şirkətlərin karbon emissiyalarını avtomatik hesablayan və azaltma yol xəritəsi təqdim edən SaaS həlli.",
    },
    scores: [],
  },
];

/** Builds a small valid single-page PDF with correct xref offsets. */
function buildPdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  let content = `BT /F1 22 Tf 72 710 Td (${esc(title)}) Tj ET\n`;
  lines.forEach((line, i) => {
    content += `BT /F1 12 Tf 72 ${670 - i * 20} Td (${esc(line)}) Tj ET\n`;
  });

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { name: DEMO_TENANT_NAME },
  });
  if (!tenant) {
    console.error(
      "Demo tenant not found — run `npm run db:seed-demo` first."
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("Demo123!", 12);

  // ── Jury users ────────────────────────────────────────────────
  console.log("⚖️  Creating jury users...");
  const juryData = [
    { email: "jury@demo-teknopark.com", firstName: "Leyla", lastName: "Əliyeva" },
    { email: "jury2@demo-teknopark.com", firstName: "Tural", lastName: "Məmmədov" },
  ];
  const juries = [];
  for (const jury of juryData) {
    juries.push(
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: jury.email } },
        create: {
          tenantId: tenant.id,
          email: jury.email,
          passwordHash,
          firstName: jury.firstName,
          lastName: jury.lastName,
          role: "JURY",
          language: "az",
        },
        update: { role: "JURY", passwordHash },
      })
    );
  }

  // ── Hackathon program ─────────────────────────────────────────
  console.log("🚀 Creating hackathon program...");
  const now = new Date();
  const weeksFromNow = (w: number) =>
    new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);

  const program = await prisma.program.upsert({
    where: { applicationToken: HACKATHON_TOKEN },
    create: {
      tenantId: tenant.id,
      name: "İnnovasiya Hakatonu 2026",
      description:
        "48 saatlıq intensiv hakaton — komandalar real problemlərə texnoloji həllər qurur, layihə PDF-lərini təqdim edir və jüri qarşısında yarışır.",
      type: "hackathon",
      applicationStart: weeksFromNow(-4),
      applicationEnd: weeksFromNow(2),
      simulationStart: weeksFromNow(-1),
      simulationEnd: weeksFromNow(3),
      participantLimit: 60,
      applicationToken: HACKATHON_TOKEN,
    },
    update: {},
  });

  // ── Criteria (reset + recreate) ───────────────────────────────
  console.log("📏 Creating jury criteria...");
  await prisma.juryCriterion.deleteMany({ where: { programId: program.id } });
  const criteria = [];
  for (const [i, c] of CRITERIA.entries()) {
    criteria.push(
      await prisma.juryCriterion.create({
        data: { programId: program.id, ...c, order: i },
      })
    );
  }

  // ── Teams from existing demo participants ─────────────────────
  console.log("👥 Creating teams...");
  const participants = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "PARTICIPANT" },
    orderBy: { email: "asc" },
    take: TEAMS.length * 2,
    select: { id: true, email: true },
  });
  if (participants.length < TEAMS.length) {
    console.error("Not enough demo participants — run db:seed-demo first.");
    process.exit(1);
  }
  // Put the well-known demo login first so it lands in a team.
  participants.sort((a, b) =>
    a.email === "participant@demo.com" ? -1 : b.email === "participant@demo.com" ? 1 : 0
  );

  await prisma.hackathonTeam.deleteMany({ where: { programId: program.id } });

  for (const [teamIndex, teamDef] of TEAMS.entries()) {
    const members = participants.slice(teamIndex * 2, teamIndex * 2 + 2);
    if (members.length === 0) break;

    const team = await prisma.hackathonTeam.create({
      data: {
        programId: program.id,
        name: teamDef.name,
        slogan: teamDef.slogan,
        members: {
          create: members.map((m, i) => ({ userId: m.id, isLeader: i === 0 })),
        },
      },
    });

    // Enroll team members in the program (participant records).
    for (const member of members) {
      await prisma.participant.upsert({
        where: {
          programId_userId: { programId: program.id, userId: member.id },
        },
        create: { programId: program.id, userId: member.id, status: "ACTIVE" },
        update: {},
      });
    }

    // ── PDF submission ──────────────────────────────────────────
    const pdf = buildPdf(teamDef.project.title, [
      `Komanda: ${teamDef.name}`,
      `Hakaton: İnnovasiya Hakatonu 2026`,
      "",
      teamDef.project.summary,
      "",
      "Bu sənəd demo məqsədilə avtomatik yaradılıb.",
    ]);
    const dir = path.join(UPLOAD_ROOT, team.id);
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}.pdf`;
    await writeFile(path.join(dir, storedName), pdf);

    const submission = await prisma.projectSubmission.create({
      data: {
        teamId: team.id,
        title: teamDef.project.title,
        summary: teamDef.project.summary,
        fileName: `${teamDef.name.toLowerCase()}-layihe.pdf`,
        filePath: path.join(team.id, storedName),
        fileSize: pdf.length,
        version: 1,
        submittedBy: members[0].id,
      },
    });

    // ── Jury scores ─────────────────────────────────────────────
    for (const [juryIndex, scoreRow] of teamDef.scores.entries()) {
      const jury = juries[juryIndex];
      if (!jury) continue;
      for (const [criterionIndex, score] of scoreRow.entries()) {
        await prisma.juryScore.create({
          data: {
            submissionId: submission.id,
            criterionId: criteria[criterionIndex].id,
            juryUserId: jury.id,
            score,
          },
        });
      }
    }
  }

  // ── Real lesson videos ────────────────────────────────────────
  console.log("🎬 Updating lesson videos...");
  for (const [trainingKey, videos] of Object.entries(TRAINING_VIDEOS)) {
    const training = await prisma.training.findUnique({
      where: { key: trainingKey },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    if (!training) continue;
    for (const [i, lesson] of training.lessons.entries()) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoUrl: videos[i % videos.length] },
      });
    }
  }

  console.log("\n✅ Hackathon demo data ready!");
  console.log("   Jury logins: jury@demo-teknopark.com / Demo123!");
  console.log("                jury2@demo-teknopark.com / Demo123!");
  console.log(`   Program: İnnovasiya Hakatonu 2026 (${TEAMS.length} teams)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
