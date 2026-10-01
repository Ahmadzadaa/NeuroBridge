import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { juryCriteriaSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { saveProgramCriteria } from "@/lib/jury/criteria";
import { JuryError } from "@/lib/jury/jury-error";

/** Replaces the programme's evaluation criteria (names only, once scoring has started). */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const body = parseBody(juryCriteriaSchema, await request.json());
      const owned = await prisma.program.count({ where: { id, tenantId: session.tenantId! } });
      if (!owned) throw new JuryError("PROGRAM_NOT_FOUND", 404, "Program not found");
      const criteria = await saveProgramCriteria(id, body.criteria);
      return { criteria };
    },
    { requireTenant: true }
  );
}
