export type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "TENANT_VIEWER"
  | "PARTICIPANT"
  | "JURY";

export type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type ParticipantStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export type PaymentProvider = "STRIPE" | "PAYRIFF" | "IYZICO";

export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "TENANT_ADMIN"];
