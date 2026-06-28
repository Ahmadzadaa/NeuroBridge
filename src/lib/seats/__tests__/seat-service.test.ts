import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeSeat, addSeatsFromPayment } from "@/lib/seats/seat-service";
import { SeatLimitReachedError } from "@/lib/seats/errors";

describe("seat-service", () => {
  const mockTx = {
    $queryRaw: vi.fn(),
    tenant: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes a seat when capacity remains", async () => {
    mockTx.$queryRaw.mockResolvedValue([
      { id: "t1", seat_limit: 10, seats_used: 5, status: "ACTIVE" },
    ]);
    mockTx.tenant.update.mockResolvedValue({ seatsUsed: 6, seatLimit: 10 });

    const result = await consumeSeat(mockTx as never, "t1");

    expect(result.seatsUsed).toBe(6);
    expect(result.seatLimit).toBe(10);
  });

  it("throws when seat limit is reached", async () => {
    mockTx.$queryRaw.mockResolvedValue([
      { id: "t1", seat_limit: 10, seats_used: 10, status: "ACTIVE" },
    ]);

    await expect(consumeSeat(mockTx as never, "t1")).rejects.toBeInstanceOf(
      SeatLimitReachedError
    );
  });

  it("adds seats from payment", async () => {
    mockTx.$queryRaw.mockResolvedValue([
      { id: "t1", seat_limit: 50, seats_used: 10, status: "ACTIVE" },
    ]);
    mockTx.tenant.update.mockResolvedValue({});

    const result = await addSeatsFromPayment(mockTx as never, "t1", 50);

    expect(result.previousLimit).toBe(50);
    expect(result.newLimit).toBe(100);
  });

  it("reduces seats on refund without going below seats used", async () => {
    const { removeSeatsFromRefund } = await import("@/lib/seats/seat-service");
    mockTx.$queryRaw.mockResolvedValue([
      { id: "t1", seat_limit: 100, seats_used: 90, status: "ACTIVE" },
    ]);
    mockTx.tenant.update.mockResolvedValue({});

    const result = await removeSeatsFromRefund(mockTx as never, "t1", 50);
    expect(result.newLimit).toBe(90);
  });
});
