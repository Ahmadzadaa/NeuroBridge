export class CertificateDisabledError extends Error {
  constructor(type: string) {
    super(`Certificate type ${type} is disabled for this tenant`);
    this.name = "CertificateDisabledError";
  }
}

export class CertificateAlreadyIssuedError extends Error {
  constructor() {
    super("Certificate of this type already issued for this user");
    this.name = "CertificateAlreadyIssuedError";
  }
}

export class CertificateParticipantNotFoundError extends Error {
  constructor() {
    super("User is not a participant in this tenant");
    this.name = "CertificateParticipantNotFoundError";
  }
}
