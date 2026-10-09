import { describe, expect, it } from "vitest";
import {
  SeatLimitReachedError,
  DuplicateRegistrationError,
  RegistrationClosedError,
} from "@/lib/seats/errors";

describe("seat errors", () => {
  it("exposes error metadata", () => {
    expect(new SeatLimitReachedError().statusCode).toBe(409);
    expect(new DuplicateRegistrationError().name).toBe("DuplicateRegistrationError");
    expect(new RegistrationClosedError().statusCode).toBe(403);
  });
});
