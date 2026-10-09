export class SubscriptionNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "No subscription for this organization") {
    super(message);
    this.name = "SubscriptionNotFoundError";
  }
}

export class SubscriptionAlreadyExistsError extends Error {
  readonly statusCode = 409;

  constructor(message = "This organization already has a subscription") {
    super(message);
    this.name = "SubscriptionAlreadyExistsError";
  }
}

export class SubscriptionNotActiveError extends Error {
  readonly statusCode = 403;

  constructor(message = "Subscription is not active") {
    super(message);
    this.name = "SubscriptionNotActiveError";
  }
}

/** Raised when the requested seat count is the one already in effect. */
export class SeatChangeNotNeededError extends Error {
  readonly statusCode = 400;

  constructor(message = "Seat count is already set to that value") {
    super(message);
    this.name = "SeatChangeNotNeededError";
  }
}

export class BelowMinimumSeatsError extends Error {
  readonly statusCode = 400;

  constructor(minSeats: number) {
    super(`Seat count cannot go below the plan minimum of ${minSeats}`);
    this.name = "BelowMinimumSeatsError";
  }
}

/** Seats cannot drop below the number of users currently occupying them. */
export class SeatsBelowActiveUsersError extends Error {
  readonly statusCode = 409;

  constructor(activeUsers: number) {
    super(
      `Seat count cannot go below the ${activeUsers} active users. Deactivate users first.`
    );
    this.name = "SeatsBelowActiveUsersError";
  }
}

/**
 * 402 Payment Required: the tenant has run out of paid seats. The `code` is
 * what clients branch on to show an "upgrade" prompt.
 */
export class SeatLimitExceededError extends Error {
  readonly statusCode = 402;
  readonly code = "SEAT_LIMIT_EXCEEDED";
  readonly seatLimit: number;
  readonly seatsUsed: number;

  constructor(seatsUsed: number, seatLimit: number) {
    super(`All ${seatLimit} seats are in use. Add seats to invite more people.`);
    this.name = "SeatLimitExceededError";
    this.seatsUsed = seatsUsed;
    this.seatLimit = seatLimit;
  }
}

/** 402: the subscription lapsed, so the tenant is read-only. */
export class SubscriptionExpiredError extends Error {
  readonly statusCode = 402;
  readonly code = "SUBSCRIPTION_EXPIRED";

  constructor(
    message = "Subscription has expired. Renew it to make changes; your data is safe."
  ) {
    super(message);
    this.name = "SubscriptionExpiredError";
  }
}

export class InvoiceNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "Invoice not found") {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceNotPayableError extends Error {
  readonly statusCode = 409;

  constructor(status: string) {
    super(`Invoice cannot be paid because its status is ${status}`);
    this.name = "InvoiceNotPayableError";
  }
}

/** The offline approval path is only valid for MANUAL invoices. */
export class InvoiceNotManualError extends Error {
  readonly statusCode = 400;

  constructor(message = "Only manually paid invoices can be approved by hand") {
    super(message);
    this.name = "InvoiceNotManualError";
  }
}
