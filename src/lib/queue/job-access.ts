import type { AuthSession } from "@/lib/auth/session";

export interface JobPayloadScope {
  userId?: string;
  tenantId?: string;
}

export function canAccessJobPayload(
  payload: JobPayloadScope,
  session: Pick<AuthSession, "id" | "role" | "tenantId">
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (payload.userId !== session.id) return false;
  if (
    payload.tenantId &&
    session.tenantId &&
    payload.tenantId !== session.tenantId
  ) {
    return false;
  }
  return true;
}
