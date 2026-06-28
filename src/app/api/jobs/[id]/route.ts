import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { canAccessJobPayload } from "@/lib/queue/job-access";
import { getJob } from "@/lib/queue/queue";
import type { ReportExportResult } from "@/lib/queue/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("report:export", async ({ session }) => {
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const payload = JSON.parse(job.payload) as { userId?: string; tenantId?: string };
    if (!canAccessJobPayload(payload, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status === "COMPLETED" && job.result) {
      const result = JSON.parse(job.result) as ReportExportResult;
      return {
        id: job.id,
        status: job.status,
        filename: result.filename,
        rowCount: result.rowCount,
        downloadUrl: `/api/jobs/${job.id}/download`,
      };
    }

    return {
      id: job.id,
      status: job.status,
      error: job.error ?? null,
    };
  });
}
