import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { TeacherDashboardClient } from "./teacher-client";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TEACHER"]);
  await requireFeature(session.user.tenantId, "teachers");

  // Ensure the teacher always has an invite token (promoted accounts may lack one).
  let me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteToken: true },
  });
  if (!me?.inviteToken) {
    me = await prisma.user.update({
      where: { id: session.user.id },
      data: { inviteToken: randomUUID() },
      select: { inviteToken: true },
    });
  }

  const [students, scenarioCount, pendingGrades] = await Promise.all([
    prisma.user.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        university: true,
        faculty: true,
        specialty: true,
        studyYear: true,
        avatarPath: true,
        simulationRuns: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { score: true, teacherGrade: true, teacherMaxGrade: true },
        },
      },
    }),
    prisma.simulation.count({ where: { createdById: session.user.id } }),
    prisma.simulationRun.count({
      where: {
        status: "COMPLETED",
        teacherGrade: null,
        user: { teacherId: session.user.id },
      },
    }),
  ]);

  // Built here rather than in the browser so the client has nothing to derive
  // after mount — see the note in teacher-client.tsx.
  const inviteUrl = `${await getAppOrigin()}/${locale}/join/${me.inviteToken}`;

  return (
    <TeacherDashboardClient
      userName={session.user.name ?? "Teacher"}
      inviteUrl={inviteUrl}
      scenarioCount={scenarioCount}
      pendingGrades={pendingGrades}
      students={students.map((student) => ({
        id: student.id,
        name:
          [student.firstName, student.lastName].filter(Boolean).join(" ") ||
          student.email,
        email: student.email,
        joinedAt: student.createdAt.toISOString(),
        university: student.university,
        faculty: student.faculty,
        specialty: student.specialty,
        studyYear: student.studyYear,
        avatarUrl: student.avatarPath
          ? `/api/profile/avatar/${student.id}`
          : null,
        lastRun: student.simulationRuns[0]
          ? {
              score: student.simulationRuns[0].score ?? 0,
              teacherGrade: student.simulationRuns[0].teacherGrade,
              teacherMaxGrade: student.simulationRuns[0].teacherMaxGrade,
            }
          : null,
      }))}
    />
  );
}
