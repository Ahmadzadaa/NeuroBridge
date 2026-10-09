import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createProgramSchema, parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { parsePagination } from "@/lib/pagination";
import { z } from "zod";
import {
  assertTrainingKeys,
  programColumns,
  programSchedule,
  ProgramAdminError,
} from "@/lib/programs/program-admin";
import { assertProgramModules } from "@/lib/tenant/entitlements";
import {
  invalidateProgramsCacheForTenant,
  listPrograms,
} from "@/lib/programs/program-service";

export async function POST(request: Request) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  // Organisations buy programmes (see order-provisioning); only the platform
  // team builds them, for a tenant named in the body.
  return withAuthorizedHandler("platform:admin", async ({ session, context }) => {
      const raw = await request.json();
      const { tenantId } = parseBody(z.object({ tenantId: z.string().trim().min(1).max(50) }), raw);
      const body = parseBody(createProgramSchema, raw);
      const schedule = programSchedule(body);

      const result = await withTenantContext(context, async (tx) => {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
        if (!tenant) throw new ProgramAdminError("TENANT_NOT_FOUND", 404, "Tenant not found");
        await assertTrainingKeys(tx, body.trainings);
        await assertProgramModules(tx, tenantId, body);

        const program = await tx.program.create({
          data: {
            tenantId,
            ...programColumns(body),
            scheduleItems: schedule.length ? { create: schedule } : undefined,
            programSimulations: {
              create: body.simulations.map((s) => ({ simulationType: s })),
            },
            programTrainings: {
              create: body.trainings.map((t) => ({ trainingType: t })),
            },
            programAiTools: {
              create: body.aiTools.map((a) => ({ aiTool: a })),
            },
          },
        });

        await recordAudit({
          tx,
          action: AUDIT_ACTIONS.PROGRAM_CREATED,
          userId: session.id,
          tenantId,
          ip: getClientIp(request),
          details: { programId: program.id, name: program.name, by: "platform" },
        });

        return {
          id: program.id,
          applicationToken: program.applicationToken,
        };
      });

      await invalidateProgramsCacheForTenant(tenantId);
      return result;
    });
}

export async function GET(request: Request) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  const pagination = parsePagination(new URL(request.url).searchParams);

  return withAuthorizedHandler(
    "program:read",
    async ({ session, context }) => {
      if (session.role === "PARTICIPANT") {
        return withTenantContext(context, async (tx) => {
          const enrollments = await tx.participant.findMany({
            where: { userId: session.id },
            select: {
              program: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  applicationStart: true,
                  applicationEnd: true,
                  simulationStart: true,
                  simulationEnd: true,
                  participantLimit: true,
                },
              },
            },
            take: pagination.pageSize,
            skip: pagination.skip,
          });
          return buildParticipantProgramList(enrollments);
        });
      }

      const isStaff =
        session.role === "TENANT_ADMIN" || session.role === "TENANT_VIEWER";

      if (!isStaff && session.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const tenantId =
        session.role === "SUPER_ADMIN" ? null : session.tenantId!;

      return listPrograms(context, tenantId, pagination);
    }
  );
}

function buildParticipantProgramList(
  enrollments: Array<{ program: Record<string, unknown> }>
) {
  return enrollments.map((e) => e.program);
}
