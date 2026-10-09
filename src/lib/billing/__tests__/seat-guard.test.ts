import { describe, expect, it, vi } from "vitest";
import {
  assertCanAddUsers,
  assertSeatAvailable,
  assertTenantCanWrite,
  getSeatAvailability,
} from "@/lib/billing/seat-guard";
import {
  SeatLimitExceededError,
  SubscriptionExpiredError,
} from "@/lib/billing/errors";

/** Minimal stand-in for the Prisma client the guard reads through. */
function fakeDb(options: {
  tenant?: { seatLimit: number; seatsUsed: number } | null;
  subscription?: { status: string } | null;
}) {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue(
        options.tenant === undefined
          ? { seatLimit: 10, seatsUsed: 0 }
          : options.tenant
      ),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(options.subscription ?? null),
    },
  } as never;
}

describe("getSeatAvailability", () => {
  it("reports the remaining seats", async () => {
    const result = await getSeatAvailability(
      "t1",
      fakeDb({ tenant: { seatLimit: 50, seatsUsed: 20 } })
    );
    expect(result).toEqual({ seatLimit: 50, seatsUsed: 20, seatsAvailable: 30 });
  });

  it("never reports negative availability when over-subscribed", async () => {
    const result = await getSeatAvailability(
      "t1",
      fakeDb({ tenant: { seatLimit: 10, seatsUsed: 15 } })
    );
    expect(result.seatsAvailable).toBe(0);
  });

  it("throws for an unknown tenant", async () => {
    await expect(
      getSeatAvailability("missing", fakeDb({ tenant: null }))
    ).rejects.toThrow(/Tenant not found/);
  });
});

describe("assertSeatAvailable", () => {
  it("allows a seat when one is free", async () => {
    await expect(
      assertSeatAvailable("t1", 1, fakeDb({ tenant: { seatLimit: 10, seatsUsed: 9 } }))
    ).resolves.toBeDefined();
  });

  it("rejects when the last seat is taken", async () => {
    await expect(
      assertSeatAvailable("t1", 1, fakeDb({ tenant: { seatLimit: 10, seatsUsed: 10 } }))
    ).rejects.toBeInstanceOf(SeatLimitExceededError);
  });

  it("rejects a bulk invite that would overshoot", async () => {
    await expect(
      assertSeatAvailable("t1", 5, fakeDb({ tenant: { seatLimit: 10, seatsUsed: 8 } }))
    ).rejects.toBeInstanceOf(SeatLimitExceededError);
  });

  it("allows a bulk invite that exactly fills the plan", async () => {
    await expect(
      assertSeatAvailable("t1", 2, fakeDb({ tenant: { seatLimit: 10, seatsUsed: 8 } }))
    ).resolves.toBeDefined();
  });

  it("carries a 402 status and a machine-readable code", async () => {
    const error = await assertSeatAvailable(
      "t1",
      1,
      fakeDb({ tenant: { seatLimit: 3, seatsUsed: 3 } })
    ).catch((e) => e);

    expect(error).toBeInstanceOf(SeatLimitExceededError);
    expect(error.statusCode).toBe(402);
    expect(error.code).toBe("SEAT_LIMIT_EXCEEDED");
  });
});

describe("assertTenantCanWrite", () => {
  it.each(["TRIALING", "ACTIVE", "PAST_DUE"])(
    "allows writes while %s",
    async (status) => {
      await expect(
        assertTenantCanWrite("t1", fakeDb({ subscription: { status } }))
      ).resolves.toBeUndefined();
    }
  );

  it.each(["EXPIRED", "CANCELED"])("blocks writes once %s", async (status) => {
    await expect(
      assertTenantCanWrite("t1", fakeDb({ subscription: { status } }))
    ).rejects.toBeInstanceOf(SubscriptionExpiredError);
  });

  it("allows tenants that have no subscription at all", async () => {
    // Organisations predating billing must not be locked out by its arrival.
    await expect(
      assertTenantCanWrite("t1", fakeDb({ subscription: null }))
    ).resolves.toBeUndefined();
  });
});

describe("assertCanAddUsers", () => {
  it("checks the subscription before the seat count", async () => {
    // An expired tenant with free seats must still be refused.
    await expect(
      assertCanAddUsers(
        "t1",
        1,
        fakeDb({
          tenant: { seatLimit: 100, seatsUsed: 0 },
          subscription: { status: "EXPIRED" },
        })
      )
    ).rejects.toBeInstanceOf(SubscriptionExpiredError);
  });

  it("passes when the subscription is live and seats remain", async () => {
    await expect(
      assertCanAddUsers(
        "t1",
        1,
        fakeDb({
          tenant: { seatLimit: 100, seatsUsed: 5 },
          subscription: { status: "ACTIVE" },
        })
      )
    ).resolves.toBeDefined();
  });
});
