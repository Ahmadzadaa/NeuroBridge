import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TeachersPageClient } from "./teachers-client";

export default async function TeachersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  if (!session.user.tenantId) redirect(`/${locale}/tenant`);

  const teachers = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, role: "TEACHER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      _count: { select: { students: true, authoredSimulations: true } },
    },
  });

  return (
    <TeachersPageClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      canManage={session.user.role === "TENANT_ADMIN"}
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        name:
          [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") ||
          teacher.email,
        email: teacher.email,
        createdAt: teacher.createdAt.toISOString(),
        studentCount: teacher._count.students,
        scenarioCount: teacher._count.authoredSimulations,
      }))}
    />
  );
}
