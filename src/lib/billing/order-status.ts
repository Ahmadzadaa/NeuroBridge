/** Self-serve order lifecycle. Stored as String (SQLite has no enums). */
export const ORDER_STATUSES = ["PENDING", "PAID", "FAILED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
