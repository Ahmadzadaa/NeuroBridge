import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Service-based pricing: each service is priced per participant, with the
// unit price picked by participant-count tier. All money is integer kuruş.
// Quotes are always computed here on the server — client-sent prices are
// never trusted.

export type QuoteItemInput = { serviceCode: string; participantCount: number };

export type QuoteLine = {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  participantCount: number;
  unitPrice: number;
  subtotal: number;
};

export type Quote = { items: QuoteLine[]; total: number; currency: string };

export type PricingErrorCode =
  | "EMPTY_QUOTE"
  | "INVALID_PARTICIPANT_COUNT"
  | "DUPLICATE_SERVICE"
  | "UNKNOWN_SERVICE"
  | "NO_MATCHING_TIER"
  | "CURRENCY_MISMATCH";

export class PricingError extends Error {
  constructor(
    public readonly code: PricingErrorCode,
    public readonly serviceCode?: string,
  ) {
    super(serviceCode ? `${code}: ${serviceCode}` : code);
    this.name = "PricingError";
  }
}

type PricedService = {
  id: string;
  code: string;
  name: string;
  tiers: {
    minParticipants: number;
    maxParticipants: number | null;
    pricePerParticipant: number;
    currency: string;
  }[];
};

/** Pure pricing step, separated from the DB lookup so it is easy to test. */
export function priceItems(services: PricedService[], items: QuoteItemInput[]): Quote {
  if (items.length === 0) throw new PricingError("EMPTY_QUOTE");

  const byCode = new Map(services.map((s) => [s.code, s]));
  const seen = new Set<string>();
  const lines: QuoteLine[] = [];
  let currency: string | undefined;

  for (const { serviceCode, participantCount } of items) {
    if (!Number.isInteger(participantCount) || participantCount < 1) {
      throw new PricingError("INVALID_PARTICIPANT_COUNT", serviceCode);
    }
    if (seen.has(serviceCode)) throw new PricingError("DUPLICATE_SERVICE", serviceCode);
    seen.add(serviceCode);

    const service = byCode.get(serviceCode);
    if (!service) throw new PricingError("UNKNOWN_SERVICE", serviceCode);

    const tier = service.tiers.find(
      (t) =>
        participantCount >= t.minParticipants &&
        (t.maxParticipants === null || participantCount <= t.maxParticipants),
    );
    if (!tier) throw new PricingError("NO_MATCHING_TIER", serviceCode);

    currency ??= tier.currency;
    if (tier.currency !== currency) throw new PricingError("CURRENCY_MISMATCH", serviceCode);

    lines.push({
      serviceId: service.id,
      serviceCode: service.code,
      serviceName: service.name,
      participantCount,
      unitPrice: tier.pricePerParticipant,
      subtotal: tier.pricePerParticipant * participantCount,
    });
  }

  return {
    items: lines,
    total: lines.reduce((sum, l) => sum + l.subtotal, 0),
    currency: currency!,
  };
}

/**
 * Prices the requested services against the active catalogue. Pass a
 * transaction client to price inside the same transaction that saves the order.
 */
export async function calculateQuote(
  items: QuoteItemInput[],
  db: Prisma.TransactionClient = prisma,
): Promise<Quote> {
  const services = await db.service.findMany({
    where: { active: true, code: { in: items.map((i) => i.serviceCode) } },
    select: {
      id: true,
      code: true,
      name: true,
      tiers: {
        select: {
          minParticipants: true,
          maxParticipants: true,
          pricePerParticipant: true,
          currency: true,
        },
      },
    },
  });
  return priceItems(services, items);
}
