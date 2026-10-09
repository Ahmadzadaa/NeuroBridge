import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { parseBody, universityReportQuerySchema } from "@/lib/validation/schemas";
import { exportUniversityReport, getUniversityReport } from "@/lib/reports/university-service";

/** Downloads one of the university reports as Excel or PDF. */
export async function GET(request: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;
  return withAuthorizedHandler(
    "report:export",
    async ({ session }) => {
      await enforceRateLimit("export", session.id);
      const url = new URL(request.url);
      const query = parseBody(universityReportQuerySchema, { type, ...Object.fromEntries(url.searchParams) });
      const locale = query.locale ?? session.language;

      const { report, picked, t } = await getUniversityReport({
        tenantId: session.tenantId!,
        type: query.type,
        locale,
        programId: query.program,
        years: query.a !== undefined && query.b !== undefined ? [query.a, query.b] : null,
      });
      const file = await exportUniversityReport(report, query.format, locale, t);

      await recordAudit({
        action: AUDIT_ACTIONS.REPORT_EXPORTED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { reportType: query.type, format: query.format, programId: query.program ?? null, years: query.type === "yoy" ? picked : undefined },
      });

      return new Response(Buffer.from(file.body), {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    },
    { requireTenant: true }
  );
}
