import { z } from "zod";
import { BASE_CURRENCY, PRICE_CURRENCIES } from "@/lib/billing/currency";

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

// ---------------------------------------------------------------------------
// Self-serve service orders. Only service codes and participant counts come
// from the client; every price is recomputed server-side in calculateQuote.
// ---------------------------------------------------------------------------

const quoteItems = z
  .array(
    z.object({
      serviceCode: z.string().trim().min(1).max(50),
      participantCount: z
        .number()
        .int("Participant count must be a whole number")
        .min(1, "At least one participant is required")
        .max(100_000, "Participant count is unrealistically large"),
    })
  )
  .min(1, "Select at least one service")
  .max(20);

const priceCurrency = z.enum(PRICE_CURRENCIES).default(BASE_CURRENCY);

export const quoteSchema = z.object({ items: quoteItems, currency: priceCurrency });

export const createOrderSchema = z.object({
  institutionName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(200),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  locale: z.enum(["tr", "en", "az"]).default("tr"),
  currency: priceCurrency,
  items: quoteItems,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ---------------------------------------------------------------------------
// Super-admin service catalogue. Prices are integer kuruş per participant.
// Overlap between tiers is checked in service-catalog.validateTiers.
// ---------------------------------------------------------------------------

const tierSchema = z.object({
  minParticipants: z.number().int().min(1).max(1_000_000),
  maxParticipants: z.number().int().min(1).max(1_000_000).nullable(),
  pricePerParticipant: z.number().int("Price must be whole kuruş").min(0).max(100_000_000),
  currency: z.enum(PRICE_CURRENCIES).default(BASE_CURRENCY),
});

const tiersSchema = z.array(tierSchema).min(1, "At least one tier is required").max(20);

export const serviceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "Code must be letters, digits or _ (e.g. HACKATHON)"),
  name: z.string().trim().min(2).max(100),
  active: z.boolean().default(true),
  tiers: tiersSchema,
});

export const serviceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  active: z.boolean().optional(),
  tiers: tiersSchema.optional(),
});

export type TierInput = z.infer<typeof tierSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
