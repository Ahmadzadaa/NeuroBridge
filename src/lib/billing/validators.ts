import { z } from "zod";

/**
 * Billing request schemas.
 *
 * Seat counts are plain integers. Money is never accepted from the client —
 * every amount is computed server-side from the subscription's contract price,
 * so a tampered request cannot change what is charged.
 */

const seatCount = z
  .number()
  .int("Seat count must be a whole number")
  .min(0, "Seat count cannot be negative")
  .max(100_000, "Seat count is unrealistically large");

export const createSubscriptionSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  seats: seatCount,
});

export const changeSeatsSchema = z.object({
  seats: seatCount,
});

export const seatPreviewQuerySchema = z.object({
  seats: z.coerce
    .number()
    .int("Seat count must be a whole number")
    .min(0)
    .max(100_000),
});

export const approveInvoiceSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

/**
 * Super-admin-only: sets a tenant's negotiated per-seat price, in kuruş.
 * Integer-only, so a fractional lira amount is rejected rather than rounded.
 */
export const setContractPriceSchema = z.object({
  pricePerSeatMonthly: z
    .number()
    .int("Price must be an integer number of kuruş")
    .min(0, "Price cannot be negative"),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type ChangeSeatsInput = z.infer<typeof changeSeatsSchema>;
export type ApproveInvoiceInput = z.infer<typeof approveInvoiceSchema>;
