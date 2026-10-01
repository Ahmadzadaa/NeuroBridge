import { routing } from "@/i18n/routing";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { addJurorSchema, jurorActionSchema, parseBody } from "@/lib/validation/schemas";
import { addProgramJuror, removeProgramJuror, resendJurorInvitation } from "@/lib/jury/program-jury";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

type Ctx = { params: Promise<{ id: string }> };

/** Adds a juror; a new address gets an account and a one-time set-password link by email. */
export async function POST(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const { locale, ...body } = parseBody(addJurorSchema, await request.json());
      const result = await addProgramJuror({
        tenantId: session.tenantId!,
        programId: id,
        ...body,
        language: locale ?? session.language ?? routing.defaultLocale,
      });
      await recordAudit({
        action: AUDIT_ACTIONS.JURY_UPDATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { programId: id, jurorAdded: result.userId, createdAccount: result.created },
      });
      return Response.json(result, { status: 201 });
    },
    { requireTenant: true }
  );
}

/** Sends the juror a new set-password link. */
export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const { userId, locale } = parseBody(jurorActionSchema, await request.json());
      const emailed = await resendJurorInvitation(session.tenantId!, id, userId, locale ?? session.language ?? routing.defaultLocale);
      return { emailed };
    },
    { requireTenant: true }
  );
}

/** Takes a juror off this programme's panel; their account stays. */
export async function DELETE(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const { userId } = parseBody(jurorActionSchema, await request.json());
      await removeProgramJuror(session.tenantId!, id, userId);
      await recordAudit({
        action: AUDIT_ACTIONS.JURY_UPDATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { programId: id, jurorRemoved: userId },
      });
      return { removed: true };
    },
    { requireTenant: true }
  );
}
