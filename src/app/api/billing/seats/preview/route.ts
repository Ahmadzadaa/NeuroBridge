import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { seatPreviewQuerySchema } from "@/lib/billing/validators";
import { previewSeatChange } from "@/lib/billing/seat-change-service";

/**
 * Prices a seat change without charging or recording anything — this is what
 * the "what will this cost?" screen calls as the user drags the seat count.
 */
export async function GET(request: Request) {
  return withAuthorizedHandler(
    "billing:read",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const url = new URL(request.url);
      const { seats } = parseBody(seatPreviewQuerySchema, {
        seats: url.searchParams.get("seats"),
      });

      return previewSeatChange(session.tenantId, seats);
    },
    { requireTenant: true }
  );
}
