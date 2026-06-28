export class SeatLimitReachedError extends Error {
  readonly statusCode = 409;

  constructor(message = "Seat limit reached") {
    super(message);
    this.name = "SeatLimitReachedError";
  }
}

export class TenantNotActiveError extends Error {
  readonly statusCode = 403;

  constructor(message = "Tenant is not active") {
    super(message);
    this.name = "TenantNotActiveError";
  }
}

export class ProgramCapacityReachedError extends Error {
  readonly statusCode = 409;

  constructor(message = "Program participant limit reached") {
    super(message);
    this.name = "ProgramCapacityReachedError";
  }
}

export class RegistrationClosedError extends Error {
  readonly statusCode = 403;

  constructor(message = "Registration is not open for this program") {
    super(message);
    this.name = "RegistrationClosedError";
  }
}

export class DuplicateRegistrationError extends Error {
  readonly statusCode = 409;

  constructor(message = "Already registered for this program") {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  readonly statusCode = 409;

  constructor(message = "Email already registered for this organization") {
    super(message);
    this.name = "EmailAlreadyRegisteredError";
  }
}
