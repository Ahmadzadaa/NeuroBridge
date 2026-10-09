import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JoinClient } from "./join-client";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const teacher = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: {
      role: true,
      firstName: true,
      lastName: true,
      tenant: { select: { name: true, status: true } },
    },
  });
  if (
    !teacher ||
    teacher.role !== "TEACHER" ||
    teacher.tenant?.status !== "ACTIVE"
  ) {
    notFound();
  }

  return (
    <JoinClient
      locale={locale}
      token={token}
      teacherName={
        [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || ""
      }
      organizationName={teacher.tenant?.name ?? ""}
    />
  );
}
