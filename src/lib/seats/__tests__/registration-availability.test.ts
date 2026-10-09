import { describe, expect, it } from "vitest";
import { registrationAvailability, type ApplyProgram } from "@/lib/seats/registration-service";

const program = (setupStatus: string) =>
  ({
    applicationStart: new Date("2026-10-01"),
    applicationEnd: new Date("2026-10-31"),
    participantLimit: 50,
    setupStatus,
    tenant: { status: "ACTIVE", seatLimit: 100, seatsUsed: 10 },
    _count: { participants: 5 },
  }) as unknown as ApplyProgram;

describe("registrationAvailability", () => {
  const inWindow = new Date("2026-10-10");

  it("is open for a live programme inside its window", () => {
    expect(registrationAvailability(program("READY"), inWindow).canRegister).toBe(true);
  });

  it("stays closed while a paid programme is still being set up", () => {
    const result = registrationAvailability(program("PENDING_SETUP"), inWindow);
    expect(result.registrationOpen).toBe(false);
    expect(result.canRegister).toBe(false);
  });
});
