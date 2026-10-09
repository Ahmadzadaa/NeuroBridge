/**
 * Certificate domain errors.
 *
 * These used to carry no `statusCode`, so `apiErrorResponse` treated every one
 * of them as an unhandled 500 — a tenant that had simply switched a
 * certificate type off looked like a broken server. The `code` is what the
 * browser translates; the message text is for logs.
 */

export class CertificateDisabledError extends Error {
  readonly statusCode = 403;
  readonly code = "CERTIFICATE_DISABLED";

  constructor(type: string) {
    super(`Certificate type ${type} is disabled for this tenant`);
    this.name = "CertificateDisabledError";
  }
}

export class CertificateAlreadyIssuedError extends Error {
  readonly statusCode = 409;
  readonly code = "CERTIFICATE_ALREADY_ISSUED";

  constructor() {
    super("Certificate of this type already issued for this user");
    this.name = "CertificateAlreadyIssuedError";
  }
}

export class CertificateParticipantNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "CERTIFICATE_PARTICIPANT_NOT_FOUND";

  constructor() {
    super("User is not a participant in this tenant");
    this.name = "CertificateParticipantNotFoundError";
  }
}
