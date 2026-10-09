import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/lib/pricing";
import { buildOrderMerchantOid } from "@/lib/payment/paytr/paytr.hash";
import { requestPaytrCheckoutUrl } from "@/lib/billing/checkout-service";
import type { CreateOrderInput } from "@/lib/billing/validators";

/**
 * Self-serve service orders. An order is created PENDING with prices
 * recomputed on the server, then handed to PayTR. The tenant is only
 * provisioned once the PayTR callback confirms payment.
 */

/**
 * Login looks users up by email alone, so the admin email must not already
 * belong to an account. Checked before payment — after it, we could only
 * provision an account that cannot sign in.
 */
export class EmailTakenError extends Error {
  readonly code = "EMAIL_TAKEN";
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailTakenError";
  }
}

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { email: input.contactEmail },
      select: { id: true },
    });
    if (existing) throw new EmailTakenError();

    const quote = await calculateQuote(input.items, input.currency, tx);

    return tx.order.create({
      data: {
        institutionName: input.institutionName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        locale: input.locale,
        total: quote.total,
        currency: quote.currency,
        paytrMerchantOid: buildOrderMerchantOid(),
        items: {
          create: quote.items.map((line) => ({
            serviceId: line.serviceId,
            participantCount: line.participantCount,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
    });
  });
}

/**
 * An existing organisation buying one more programme. No email check: the
 * buyer is the signed-in admin, and nothing new is provisioned for them —
 * the paid programme is added to their tenant (see order-provisioning).
 */
export async function createProgramOrder(input: {
  tenantId: string;
  institutionName: string;
  contactName: string;
  contactEmail: string;
  locale: string;
  currency: CreateOrderInput["currency"];
  items: CreateOrderInput["items"];
}) {
  return prisma.$transaction(async (tx) => {
    const quote = await calculateQuote(input.items, input.currency, tx);
    return tx.order.create({
      data: {
        kind: "ADD_PROGRAM",
        tenantId: input.tenantId,
        institutionName: input.institutionName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        locale: input.locale,
        total: quote.total,
        currency: quote.currency,
        paytrMerchantOid: buildOrderMerchantOid(),
        items: {
          create: quote.items.map((line) => ({
            serviceId: line.serviceId,
            participantCount: line.participantCount,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
    });
  });
}

export async function startOrderCheckout(
  order: Awaited<ReturnType<typeof createOrder>>,
  userIp: string,
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
): Promise<string> {
  // A programme bought from inside the panel returns there, not to the public page.
  const returnPath = order.kind === "ADD_PROGRAM" ? "/tenant/programs" : "/pricing";
  const pricingUrl = `${appUrl}/${order.locale}${returnPath}`;
  try {
    return await requestPaytrCheckoutUrl({
      merchantOid: order.paytrMerchantOid,
      customerEmail: order.contactEmail,
      amount: order.total,
      currency: order.currency,
      description: `BizSim - ${order.institutionName}`,
      userIp,
      okUrl: `${pricingUrl}?payment=success`,
      failUrl: `${pricingUrl}?payment=failed`,
      lang: order.locale === "tr" ? "tr" : "en",
    });
  } catch (error) {
    // The PayTR handshake never started, so this order can never be paid.
    await prisma.order
      .update({ where: { id: order.id }, data: { status: "FAILED" } })
      .catch(() => undefined);
    throw error;
  }
}
