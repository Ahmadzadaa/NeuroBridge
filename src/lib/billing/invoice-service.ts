import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { buildMerchantOid } from "@/lib/payment/paytr/paytr.hash";
import { assertKurus } from "@/lib/billing/money";
import type {
  InvoiceMethod,
  InvoiceStatus,
  InvoiceType,
  SeatChangeReason,
} from "@/lib/types";
import {
  InvoiceNotFoundError,
  InvoiceNotManualError,
  InvoiceNotPayableError,
} from "@/lib/billing/errors";
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId?: string | null;
  /** Integer kuruş. */
  amount: number;
  currency?: string;
  type: InvoiceType;
  method?: InvoiceMethod;
  /**
   * For SEAT_UPGRADE and SUBSCRIPTION invoices this is the seat count that
   * takes effect once the invoice is paid — the new total, not the delta.
   */
  seatCount?: number;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  note?: string | null;
  actorId?: string;
}

export async function createInvoice(input: CreateInvoiceInput) {
  assertKurus(input.amount, "invoice amount");

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId ?? null,
        merchantOid: buildMerchantOid(input.tenantId),
        amount: input.amount,
        currency: input.currency ?? "TRY",
        type: input.type,
        method: input.method ?? "PAYTR",
        status: "PENDING",
        seatCount: input.seatCount ?? null,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        note: input.note ?? null,
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.INVOICE_CREATED,
      tenantId: input.tenantId,
      userId: input.actorId,
      details: {
        invoiceId: created.id,
        merchantOid: created.merchantOid,
        amount: created.amount,
        type: created.type,
        method: created.method,
        seatCount: created.seatCount,
      },
    });

    return created;
  });

  return invoice;
}

/**
 * Pushes the subscription's seat count out to `Tenant.seatLimit`.
 *
 * The rest of the application (registration, seat guard, dashboards) reads
 * `Tenant.seatLimit`, so billing is only meaningful once it is mirrored there.
 * Never lowers the limit below the seats already occupied.
 */
async function syncTenantSeatLimit(
  tx: Prisma.TransactionClient,
  tenantId: string,
  seats: number
): Promise<{ previousLimit: number; newLimit: number }> {
  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { seatLimit: true, seatsUsed: true, status: true },
  });

  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  const newLimit = Math.max(seats, tenant.seatsUsed);

  await tx.tenant.update({
    where: { id: tenantId },
    data: {
      seatLimit: newLimit,
      ...(tenant.status === "PENDING" ? { status: "ACTIVE" } : {}),
    },
  });

  return { previousLimit: tenant.seatLimit, newLimit };
}

export interface MarkInvoicePaidOptions {
  paidAt?: Date;
  /** Set when a super admin confirms an offline transfer. */
  approvedBy?: string;
  seatChangeReason?: SeatChangeReason;
}

/**
 * Settles an invoice and applies whatever it paid for.
 *
 * Idempotent: a PayTR callback may arrive more than once, so a second call on
 * an already-paid invoice is a no-op rather than a double seat grant.
 */
export async function markInvoicePaid(
  invoiceId: string,
  options: MarkInvoicePaidOptions = {}
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new InvoiceNotFoundError();

    if (invoice.status === "PAID") {
      return { invoice, alreadyPaid: true as const, seatsApplied: false };
    }

    if (invoice.status === "REFUNDED") {
      throw new InvoiceNotPayableError(invoice.status);
    }

    const paidAt = options.paidAt ?? new Date();

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID" satisfies InvoiceStatus,
        paidAt,
        ...(options.approvedBy
          ? { approvedBy: options.approvedBy, approvedAt: paidAt }
          : {}),
      },
    });

    let seatsApplied = false;

    if (invoice.seatCount !== null && invoice.subscriptionId) {
      const subscription = await tx.subscription.findUnique({
        where: { id: invoice.subscriptionId },
        select: { seats: true, status: true },
      });

      if (subscription) {
        const previousSeats = subscription.seats;

        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: {
            seats: invoice.seatCount,
            // Paying clears any dunning state.
            status: subscription.status === "PAST_DUE" ? "ACTIVE" : undefined,
            pastDueSince: null,
            dunningAttempts: 0,
            nextRetryAt: null,
            ...(invoice.periodStart && invoice.periodEnd
              ? {
                  currentPeriodStart: invoice.periodStart,
                  currentPeriodEnd: invoice.periodEnd,
                }
              : {}),
          },
        });

        const limits = await syncTenantSeatLimit(
          tx,
          invoice.tenantId,
          invoice.seatCount
        );

        await tx.seatChangeLog.create({
          data: {
            tenantId: invoice.tenantId,
            oldSeats: previousSeats,
            newSeats: invoice.seatCount,
            changedBy: options.approvedBy ?? null,
            invoiceId: invoice.id,
            reason: options.seatChangeReason ?? "UPGRADE",
          },
        });

        await recordAudit({
          tx,
          action: AUDIT_ACTIONS.SEAT_CHANGE_APPLIED,
          tenantId: invoice.tenantId,
          userId: options.approvedBy,
          details: {
            invoiceId: invoice.id,
            oldSeats: previousSeats,
            newSeats: invoice.seatCount,
            tenantSeatLimit: limits.newLimit,
          },
        });

        seatsApplied = true;
      }
    }

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.INVOICE_PAID,
      tenantId: invoice.tenantId,
      userId: options.approvedBy,
      details: {
        invoiceId: invoice.id,
        merchantOid: invoice.merchantOid,
        amount: invoice.amount,
        method: invoice.method,
      },
    });

    return { invoice: updated, alreadyPaid: false as const, seatsApplied };
  });
}

export async function markInvoiceFailed(invoiceId: string, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new InvoiceNotFoundError();

  if (invoice.status === "PAID" || invoice.status === "REFUNDED") {
    return invoice;
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "FAILED" satisfies InvoiceStatus,
      note: reason ?? invoice.note,
    },
  });
}

/**
 * The offline "bank transfer" path: money arrived outside the system and a
 * super admin vouches for it. Restricted to MANUAL invoices so a card invoice
 * can never be waved through by hand.
 */
export async function approveManualInvoice(
  invoiceId: string,
  superAdminId: string,
  note?: string
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new InvoiceNotFoundError();

  if (invoice.method !== "MANUAL") {
    throw new InvoiceNotManualError();
  }

  if (invoice.status === "PAID") {
    return { invoice, alreadyPaid: true as const };
  }

  if (invoice.status === "REFUNDED") {
    throw new InvoiceNotPayableError(invoice.status);
  }

  if (note) {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { note } });
  }

  const result = await markInvoicePaid(invoiceId, { approvedBy: superAdminId });

  await recordAudit({
    action: AUDIT_ACTIONS.INVOICE_MANUALLY_APPROVED,
    tenantId: invoice.tenantId,
    userId: superAdminId,
    details: {
      invoiceId: invoice.id,
      amount: invoice.amount,
      note: note ?? null,
    },
  });

  return { invoice: result.invoice, alreadyPaid: false as const };
}

export async function findInvoiceByMerchantOid(merchantOid: string) {
  return prisma.invoice.findUnique({ where: { merchantOid } });
}

export async function listInvoices(
  tenantId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<Prisma.InvoiceGetPayload<object>>> {
  const where = { tenantId };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return buildPaginatedResult(items, total, pagination);
}
