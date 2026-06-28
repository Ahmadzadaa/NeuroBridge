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
    if (!job || job.status !== "COMPLETED" || !job.result) {
      return NextResponse.json({ error: "Export not ready" }, { status: 404 });
    }

    const payload = JSON.parse(job.payload) as { userId?: string; tenantId?: string };
    if (!canAccessJobPayload(payload, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = JSON.parse(job.result) as ReportExportResult;

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  });
}
