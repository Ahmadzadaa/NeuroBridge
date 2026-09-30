import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { updateJuryDate } from "@/lib/programs/schedule-service";

const bodySchema = z.object({ date: z.coerce.date() });

/** University: moves a generated jury presentation (weekdays inside the program only). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await context.params;
  return withAuthorizedHandler(
    "program:write",
    async ({ session }) => {
      const { date } = parseBody(bodySchema, await request.json());
      const item = await updateJuryDate(session.tenantId!, itemId, date);
      return { id: item.id, startsOn: item.startsOn, endsOn: item.endsOn, editedAt: item.editedAt };
    },
    { requireTenant: true }
  );
}
