export type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "TENANT_VIEWER"
  | "PARTICIPANT"
  | "JURY"
  | "TEACHER";

export type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type ParticipantStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export type PaymentProvider = "PAYTR";

/**
 * Billing status unions. These are stored as `String` columns because the
 * SQLite connector used in local dev has no enum support — the type safety
 * lives here instead.
 */
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";

export type InvoiceStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type InvoiceType = "SUBSCRIPTION" | "SEAT_UPGRADE";

/** MANUAL is the offline bank-transfer flow a super admin confirms by hand. */
export type InvoiceMethod = "PAYTR" | "MANUAL";

export type SeatChangeReason =
  | "UPGRADE"
  | "DOWNGRADE_SCHEDULED"
  | "DOWNGRADE_APPLIED"
  | "ADMIN_OVERRIDE";

/** Statuses that still grant full write access to the tenant. */
export const WRITABLE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
];

export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "TENANT_ADMIN"];
