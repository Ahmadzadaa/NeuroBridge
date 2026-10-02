import { NextResponse, after } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { reportExportSchema, parseBody } from "@/lib/validation/schemas";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { enqueueJob, processJob } from "@/lib/queue/queue";
import { handleJob } from "@/lib/queue/handlers";
import { isRedisAvailable } from "@/lib/redis/client";
import type { ReportExportPayload } from "@/lib/queue/types";
import { exportProgramReportCsv } from "@/lib/reports/export-service";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const SYNC_EXPORT_THRESHOLD = 500;

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "report:export",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      await enforceRateLimit("export", session.id);

      const body = parseBody(reportExportSchema, await request.json());

      if (body.format === "pdf") {
        return NextResponse.json(
          { error: "PDF export is not yet available. Use CSV format." },
          { status: 501 }
        );
      }

      const { prisma } = await import("@/lib/prisma");
      const program = await prisma.program.findFirst({
        where: { id: body.programId, tenantId: session.tenantId },
        select: { id: true, _count: { select: { participants: true } } },
      });

      if (!program) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }

      const participantCount = program._count.participants;

      if (participantCount <= SYNC_EXPORT_THRESHOLD) {
        const report = await exportProgramReportCsv(body.programId, session.tenantId);

        await recordAudit({
          action: AUDIT_ACTIONS.REPORT_EXPORTED,
          userId: session.id,
          tenantId: session.tenantId,
          ip: getClientIp(request),
          details: {
            programId: body.programId,
            format: body.format,
            reportType: body.reportType,
            rowCount: report.rowCount,
            mode: "sync",
          },
        });

        return new NextResponse(report.content, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${report.filename}"`,
          },
        });
      }

      const payload: ReportExportPayload = {
        programId: body.programId,
        tenantId: session.tenantId,
        userId: session.id,
        format: body.format,
        reportType: body.reportType,
      };

      const jobId = await enqueueJob("REPORT_EXPORT", payload);
      // Without Redis the queue lives in this process's memory, out of the
      // worker's reach, so the app builds the file itself once it has replied.
      if (!isRedisAvailable()) after(() => processJob(jobId, handleJob));

      await recordAudit({
        action: AUDIT_ACTIONS.REPORT_EXPORTED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          programId: body.programId,
          format: body.format,
          reportType: body.reportType,
          rowCount: participantCount,
          mode: "async",
          jobId,
        },
      });

      return NextResponse.json(
        { jobId, status: "PENDING", pollUrl: `/api/jobs/${jobId}` },
        { status: 202 }
      );
    },
    { requireTenant: true }
  );
}
