import { describe, expect, it } from "vitest";
import {
  CertificateDisabledError,
  CertificateAlreadyIssuedError,
  CertificateParticipantNotFoundError,
} from "@/lib/certificates/errors";

describe("certificate errors", () => {
  it("sets error names", () => {
    expect(new CertificateDisabledError("PARTICIPATION").name).toBe(
      "CertificateDisabledError"
    );
    expect(new CertificateAlreadyIssuedError().name).toBe(
      "CertificateAlreadyIssuedError"
    );
    expect(new CertificateParticipantNotFoundError().name).toBe(
      "CertificateParticipantNotFoundError"
    );
  });
});
