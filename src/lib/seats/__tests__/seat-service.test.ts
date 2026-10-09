import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeSeat, addSeatsFromPayment } from "@/lib/seats/seat-service";
import { SeatLimitReachedError } from "@/lib/seats/errors";

describe("seat-service", () => {
  const mockTx = {
    $queryRaw: vi.fn(),
    tenant: { update: vi.fn(), findUnique: vi.fn() },
  };

  // Mirror a tenant row for both the Postgres (raw, snake_case) and the
  // SQLite (Prisma findUnique, camelCase) lock paths so the test passes
  // regardless of the configured database.
  function mockTenantRow(row: {
    id: string;
    seatLimit: number;
    seatsUsed: number;
    status: string;
  }) {
    mockTx.$queryRaw.mockResolvedValue([
      {
        id: row.id,
        seat_limit: row.seatLimit,
        seats_used: row.seatsUsed,
        status: row.status,
      },
    ]);
    mockTx.tenant.findUnique.mockResolvedValue(row);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes a seat when capacity remains", async () => {
    mockTenantRow({ id: "t1", seatLimit: 10, seatsUsed: 5, status: "ACTIVE" });
    mockTx.tenant.update.mockResolvedValue({ seatsUsed: 6, seatLimit: 10 });

    const result = await consumeSeat(mockTx as never, "t1");

    expect(result.seatsUsed).toBe(6);
    expect(result.seatLimit).toBe(10);
  });

  it("throws when seat limit is reached", async () => {
    mockTenantRow({ id: "t1", seatLimit: 10, seatsUsed: 10, status: "ACTIVE" });

    await expect(consumeSeat(mockTx as never, "t1")).rejects.toBeInstanceOf(
      SeatLimitReachedError
    );
  });

  it("adds seats from payment", async () => {
    mockTenantRow({ id: "t1", seatLimit: 50, seatsUsed: 10, status: "ACTIVE" });
    mockTx.tenant.update.mockResolvedValue({});

    const result = await addSeatsFromPayment(mockTx as never, "t1", 50);

    expect(result.previousLimit).toBe(50);
    expect(result.newLimit).toBe(100);
  });

  it("reduces seats on refund without going below seats used", async () => {
    const { removeSeatsFromRefund } = await import("@/lib/seats/seat-service");
    mockTenantRow({ id: "t1", seatLimit: 100, seatsUsed: 90, status: "ACTIVE" });
    mockTx.tenant.update.mockResolvedValue({});

    const result = await removeSeatsFromRefund(mockTx as never, "t1", 50);
    expect(result.newLimit).toBe(90);
  });
});
