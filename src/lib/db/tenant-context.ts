import type { Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const TENANT_SETTING = "app.current_tenant_id";
const USER_SETTING = "app.current_user_id";
const ROLE_SETTING = "app.current_role";
const SUPER_ADMIN_SETTING = "app.is_super_admin";

export function isPostgresDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

type DbClient = Prisma.TransactionClient | typeof prisma;

async function applyPostgresSessionContext(
  client: DbClient,
  context: TenantContext
): Promise<void> {
  await client.$executeRaw`
    SELECT set_config(${TENANT_SETTING}, ${context.tenantId ?? ""}, true)
  `;
  await client.$executeRaw`
    SELECT set_config(${USER_SETTING}, ${context.userId}, true)
  `;
  await client.$executeRaw`
    SELECT set_config(${ROLE_SETTING}, ${context.role}, true)
  `;
  await client.$executeRaw`
    SELECT set_config(${SUPER_ADMIN_SETTING}, ${context.isSuperAdmin ? "true" : "false"}, true)
  `;
}

export async function setTenantContext(context: TenantContext): Promise<void> {
  if (!isPostgresDatabase()) return;
  await applyPostgresSessionContext(prisma, context);
}

export async function withTenantContext<T>(
  context: TenantContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!isPostgresDatabase()) {
    return prisma.$transaction(async (tx) => fn(tx));
  }

  return prisma.$transaction(async (tx) => {
    await applyPostgresSessionContext(tx, context);
    return fn(tx);
  });
}

export async function clearTenantContext(): Promise<void> {
  await setTenantContext({
    tenantId: null,
    userId: "",
    role: "PARTICIPANT",
    isSuperAdmin: false,
  });
}
