import { buildTenantContext } from "@/lib/auth/session";
import { listTenantParticipants } from "@/lib/participants/participant-service";
import { parsePagination } from "@/lib/pagination";

async function main() {
  const context = buildTenantContext({
    id: "test",
    email: "tenant@demo-tekno.com",
    name: "Tenant Admin",
    role: "TENANT_ADMIN",
    tenantId: "demo-tenant",
    language: "tr",
    twoFactorEnabled: false,
    twoFactorVerified: true,
    requires2FASetup: false,
  });

  const result = await listTenantParticipants(
    context,
    "demo-tenant",
    parsePagination(new URLSearchParams({ page: "1", pageSize: "25" }))
  );

  console.log("participants:", result.total, "total");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
