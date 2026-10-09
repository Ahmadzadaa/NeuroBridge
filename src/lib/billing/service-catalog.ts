import { prisma } from "@/lib/prisma";
import type { ServiceInput, ServiceUpdateInput, TierInput } from "@/lib/billing/validators";
import { BASE_CURRENCY, PRICE_CURRENCIES } from "@/lib/billing/currency";

/**
 * Super-admin management of the priced service catalogue.
 *
 * Tier edits never touch placed orders: OrderItem keeps its own unit-price
 * snapshot. A service that has been ordered cannot be deleted (orders and
 * tenants reference it) — deactivate it instead.
 */

export class CatalogError extends Error {
  constructor(
    public readonly code: "TIER_OVERLAP" | "TIER_RANGE" | "CODE_TAKEN" | "SERVICE_IN_USE" | "NOT_FOUND" | "BASE_CURRENCY_REQUIRED",
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

/**
 * Each currency is its own price list: within one, tiers may leave gaps but
 * must never overlap, so every participant count maps to at most one price.
 * Every service needs base-currency (TRY) prices; dollar prices are optional.
 */
export function validateTiers(tiers: TierInput[]): TierInput[] {
  if (!tiers.some((t) => t.currency === BASE_CURRENCY)) {
    throw new CatalogError("BASE_CURRENCY_REQUIRED", `Every service needs ${BASE_CURRENCY} prices`);
  }
  return PRICE_CURRENCIES.flatMap((currency) => validateCurrencyTiers(tiers.filter((t) => t.currency === currency)));
}

function validateCurrencyTiers(tiers: TierInput[]): TierInput[] {
  const sorted = [...tiers].sort((a, b) => a.minParticipants - b.minParticipants);

  for (const [i, tier] of sorted.entries()) {
    if (tier.maxParticipants !== null && tier.maxParticipants < tier.minParticipants) {
      throw new CatalogError(
        "TIER_RANGE",
        `Tier ${tier.minParticipants}–${tier.maxParticipants} ends before it starts`
      );
    }
    const next = sorted[i + 1];
    if (next && (tier.maxParticipants === null || tier.maxParticipants >= next.minParticipants)) {
      const range = `${tier.minParticipants}–${tier.maxParticipants ?? "∞"}`;
      throw new CatalogError(
        "TIER_OVERLAP",
        `Tier ${range} overlaps the tier starting at ${next.minParticipants}`
      );
    }
  }
  return sorted;
}

const tierRows = (serviceId: string, tiers: TierInput[]) =>
  tiers.map((t) => ({
    serviceId,
    minParticipants: t.minParticipants,
    maxParticipants: t.maxParticipants,
    pricePerParticipant: t.pricePerParticipant,
    currency: t.currency,
  }));

export async function createService(input: ServiceInput) {
  const tiers = validateTiers(input.tiers);
  const taken = await prisma.service.findUnique({ where: { code: input.code }, select: { id: true } });
  if (taken) throw new CatalogError("CODE_TAKEN", `Service code ${input.code} already exists`, 409);

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: { code: input.code, name: input.name, active: input.active },
    });
    await tx.servicePriceTier.createMany({ data: tierRows(service.id, tiers) });
    return service;
  });
}

/** The code is immutable: it links the service to tenant modules. */
export async function updateService(id: string, input: ServiceUpdateInput) {
  const tiers = input.tiers ? validateTiers(input.tiers) : undefined;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.service.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new CatalogError("NOT_FOUND", "Service not found", 404);

    const service = await tx.service.update({
      where: { id },
      data: { name: input.name, active: input.active },
    });
    if (tiers) {
      await tx.servicePriceTier.deleteMany({ where: { serviceId: id } });
      await tx.servicePriceTier.createMany({ data: tierRows(id, tiers) });
    }
    return service;
  });
}

export async function deleteService(id: string) {
  const service = await prisma.service.findUnique({
    where: { id },
    select: { _count: { select: { orderItems: true, tenantServices: true } } },
  });
  if (!service) throw new CatalogError("NOT_FOUND", "Service not found", 404);
  if (service._count.orderItems > 0 || service._count.tenantServices > 0) {
    throw new CatalogError(
      "SERVICE_IN_USE",
      "This service has orders or tenants; deactivate it instead",
      409
    );
  }
  // Tiers cascade with the service.
  await prisma.service.delete({ where: { id } });
}
