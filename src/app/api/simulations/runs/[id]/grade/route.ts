import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { simulationGradeSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notifications/notification-service";

/** Teacher grading: tenant staff scores a completed student run. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler(
    "simulation:grade",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "simulations");
      const body = parseBody(simulationGradeSchema, await request.json());

      const run = await prisma.simulationRun.findUnique({
        where: { id },
        include: { user: { select: { tenantId: true, teacherId: true } } },
      });
      if (!run || run.user.tenantId !== session.tenantId) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      // Teachers grade only their own students; dean grades tenant-wide.
      if (session.role === "TEACHER" && run.user.teacherId !== session.id) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      if (run.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Run is not completed yet" },
          { status: 409 }
        );
      }

      const updated = await prisma.simulationRun.update({
        where: { id },
        data: {
          teacherGrade: body.grade,
          teacherMaxGrade: body.maxGrade,
          teacherComment: body.comment ?? null,
          gradedByUserId: session.id,
          gradedAt: new Date(),
        },
        select: { teacherGrade: true, teacherMaxGrade: true },
      });
      await notifyUsers([run.userId], {
        type: "SIMULATION_GRADED",
        params: { grade: updated.teacherGrade ?? 0, max: updated.teacherMaxGrade ?? 0 },
        link: "/participant/simulations",
      });

      return NextResponse.json(updated);
    },
    { requireTenant: true }
  );
}
