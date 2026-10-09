/**
 * Each error carries a stable `code` alongside its status. The message is
 * English and written for a log; the browser looks the code up in the message
 * files instead, so a Turkish admin is not shown an English sentence.
 */
export class SeatLimitReachedError extends Error {
  readonly statusCode = 409;
  readonly code = "SEAT_LIMIT_REACHED";

  constructor(message = "Seat limit reached") {
    super(message);
    this.name = "SeatLimitReachedError";
  }
}

export class TenantNotActiveError extends Error {
  readonly statusCode = 403;
  readonly code = "TENANT_NOT_ACTIVE";

  constructor(message = "Tenant is not active") {
    super(message);
    this.name = "TenantNotActiveError";
  }
}

export class ProgramCapacityReachedError extends Error {
  readonly statusCode = 409;
  readonly code = "PROGRAM_CAPACITY_REACHED";

  constructor(message = "Program participant limit reached") {
    super(message);
    this.name = "ProgramCapacityReachedError";
  }
}

export class RegistrationClosedError extends Error {
  readonly statusCode = 403;
  readonly code = "REGISTRATION_CLOSED";

  constructor(message = "Registration is not open for this program") {
    super(message);
    this.name = "RegistrationClosedError";
  }
}

export class DuplicateRegistrationError extends Error {
  readonly statusCode = 409;
  readonly code = "DUPLICATE_REGISTRATION";

  constructor(message = "Already registered for this program") {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  readonly statusCode = 409;
  readonly code = "EMAIL_ALREADY_REGISTERED";

  constructor(message = "Email already registered for this organization") {
    super(message);
    this.name = "EmailAlreadyRegisteredError";
  }
}
