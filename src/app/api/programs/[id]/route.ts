import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createProgramSchema, parseBody } from "@/lib/validation/schemas";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { invalidateProgramsCacheForTenant } from "@/lib/programs/program-service";
import {
  assertTrainingKeys,
  programColumns,
  programSchedule,
  ProgramAdminError,
} from "@/lib/programs/program-admin";
import { assertProgramModules } from "@/lib/tenant/entitlements";

/**
 * The platform team edits a programme, and completes one a paid order created
 * in PENDING_SETUP: saving it here publishes it (READY), which opens
 * applications. Content lists are replaced as a whole, like the builder shows them.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withAuthorizedHandler("platform:admin", async ({ session, context: tenantContext }) => {
    const body = parseBody(createProgramSchema, await request.json());
    const schedule = programSchedule(body);

    const result = await withTenantContext(tenantContext, async (tx) => {
      const existing = await tx.program.findUnique({
        where: { id },
        select: { tenantId: true, setupStatus: true, programStart: true, programEnd: true },
      });
      if (!existing) throw new ProgramAdminError("PROGRAM_NOT_FOUND", 404, "Program not found");
      await assertTrainingKeys(tx, body.trainings);
      await assertProgramModules(tx, existing.tenantId, body);

      const columns = programColumns(body);
      // Regenerate the calendar only when its range moved; edited jury dates survive other changes.
      const rangeChanged =
        columns.programStart?.getTime() !== existing.programStart?.getTime() ||
        columns.programEnd?.getTime() !== existing.programEnd?.getTime();

      await tx.programSimulation.deleteMany({ where: { programId: id } });
      await tx.programTraining.deleteMany({ where: { programId: id } });
      await tx.programAiTool.deleteMany({ where: { programId: id } });
      if (rangeChanged) await tx.programScheduleItem.deleteMany({ where: { programId: id } });

      const program = await tx.program.update({
        where: { id },
        data: {
          ...columns,
          setupStatus: "READY",
          scheduleItems: rangeChanged && schedule.length ? { create: schedule } : undefined,
          programSimulations: { create: body.simulations.map((s) => ({ simulationType: s })) },
          programTrainings: { create: body.trainings.map((t) => ({ trainingType: t })) },
          programAiTools: { create: body.aiTools.map((a) => ({ aiTool: a })) },
        },
        select: { id: true, name: true, applicationToken: true },
      });

      await recordAudit({
        tx,
        action: AUDIT_ACTIONS.PROGRAM_UPDATED,
        userId: session.id,
        tenantId: existing.tenantId,
        ip: getClientIp(request),
        details: { programId: id, name: program.name, published: existing.setupStatus === "PENDING_SETUP" },
      });

      return { program, tenantId: existing.tenantId };
    });

    await invalidateProgramsCacheForTenant(result.tenantId);
    return { id: result.program.id, applicationToken: result.program.applicationToken };
  });
}
