import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { AuthorizationError } from "@/lib/auth/permissions";
import { parseBody } from "@/lib/validation/schemas";
import { approveInvoiceSchema } from "@/lib/billing/validators";
import { approveManualInvoice } from "@/lib/billing/invoice-service";

/**
 * Confirms an offline ("əldən-ələ") bank transfer.
 *
 * Restricted to super admins: this is the one path where seats are granted
 * without a provider confirming that money moved, so the platform owner
 * vouches for it personally and the approval is recorded on the invoice.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    if (session.role !== "SUPER_ADMIN") {
      throw new AuthorizationError("Only super admins can approve manual payments");
    }

    const body = parseBody(
      approveInvoiceSchema,
      await request.json().catch(() => ({}))
    );

    const result = await approveManualInvoice(id, session.id, body.note);

    return {
      invoiceId: result.invoice.id,
      status: result.invoice.status,
      alreadyPaid: result.alreadyPaid,
    };
  });
}
