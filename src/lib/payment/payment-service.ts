import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { SEAT_PACKAGES } from "@/lib/constants";
import type { PaymentProvider } from "@/lib/types";
import { getPaymentProvider } from "@/lib/payment/provider-registry";
import { PaymentConfigurationError } from "@/lib/payment/types";
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

export function calculateSeatPurchaseAmount(seatCount: number): number {
  const pkg = SEAT_PACKAGES.find((item) => item.seats === seatCount);
  if (!pkg) {
    throw new Error(`Unsupported seat package: ${seatCount}`);
  }
  return pkg.seats * pkg.pricePerSeat;
}

export async function createSeatPurchaseCheckout(input: {
  tenantId: string;
  seatCount: number;
  provider: PaymentProvider;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, status: true, seatLimit: true },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const amount = calculateSeatPurchaseAmount(input.seatCount);
  const idempotencyKey = randomUUID();
  const paymentType = tenant.seatLimit === 0 ? "INITIAL" : "UPGRADE";

  const payment = await prisma.payment.create({
    data: {
      tenantId: input.tenantId,
      amount,
      currency: "TRY",
      seatCount: input.seatCount,
      provider: input.provider,
      paymentType,
      idempotencyKey,
      status: "PENDING",
    },
  });

  try {
    const adapter = getPaymentProvider(input.provider);
    const checkout = await adapter.createCheckout({
      paymentId: payment.id,
      tenantId: input.tenantId,
      seatCount: input.seatCount,
      amount,
      currency: "TRY",
      customerEmail: input.customerEmail,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      idempotencyKey,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: checkout.providerRef },
    });

    return {
      paymentId: payment.id,
      checkoutUrl: checkout.checkoutUrl,
      amount,
      seatCount: input.seatCount,
      paymentType,
    };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    throw error instanceof PaymentConfigurationError
      ? error
      : new PaymentConfigurationError(
          error instanceof Error ? error.message : "Checkout creation failed"
        );
  }
}

export async function listTenantPayments(tenantId: string, limit = 50) {
  return prisma.payment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      currency: true,
      seatCount: true,
      status: true,
      provider: true,
      paymentType: true,
      refundedAmount: true,
      createdAt: true,
    },
  });
}

export async function listTenantPaymentsPaginated(
  tenantId: string,
  pagination: PaginationParams
): Promise<
  PaginatedResult<{
    id: string;
    amount: number;
    currency: string;
    seatCount: number;
    status: string;
    provider: string;
    paymentType: string;
    refundedAmount: number;
    createdAt: Date;
  }>
> {
  const where = { tenantId };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize,
      select: {
        id: true,
        amount: true,
        currency: true,
        seatCount: true,
        status: true,
        provider: true,
        paymentType: true,
        refundedAmount: true,
        createdAt: true,
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return buildPaginatedResult(items, total, pagination);
}
