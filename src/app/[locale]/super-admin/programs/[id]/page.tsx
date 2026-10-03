import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getTenantEntitlements } from "@/lib/tenant/entitlements";
import { trainingCatalogue } from "@/lib/programs/program-admin";
import { ProgramBuilder } from "@/components/programs/program-builder";

export default async function EditProgramPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const [program, trainingOptions] = await Promise.all([
    prisma.program.findUnique({
      where: { id },
      include: {
        tenant: { select: { name: true } },
        programSimulations: { select: { simulationType: true } },
        programTrainings: { select: { trainingType: true } },
        programAiTools: { select: { aiTool: true } },
      },
    }),
    trainingCatalogue(prisma, locale),
  ]);
  if (!program) notFound();
  const entitlements = await getTenantEntitlements(program.tenantId);

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <ProgramBuilder
      userName={session.user.name ?? "Admin"}
      trainingOptions={trainingOptions}
      entitlements={entitlements ?? undefined}
      initial={{
        id: program.id,
        tenantName: program.tenant.name,
        name: program.name,
        description: program.description,
        type: program.type,
        applicationStart: program.applicationStart.toISOString(),
        applicationEnd: program.applicationEnd.toISOString(),
        simulationStart: iso(program.simulationStart),
        simulationEnd: iso(program.simulationEnd),
        programStart: iso(program.programStart),
        programEnd: iso(program.programEnd),
        participantLimit: program.participantLimit,
        certificateName: program.certificateName,
        finalistCount: program.finalistCount,
        juryEnabled: program.juryEnabled,
        simulations: program.programSimulations.map((s) => s.simulationType),
        trainings: program.programTrainings.map((t) => t.trainingType),
        aiTools: program.programAiTools.map((a) => a.aiTool),
        pendingSetup: program.setupStatus === "PENDING_SETUP",
      }}
    />
  );
}
