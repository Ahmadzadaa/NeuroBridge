import { prisma } from "@/lib/prisma";
import {
  CacheKeys,
  CacheTTL,
  getCached,
  invalidateCache,
  setCached,
} from "@/lib/cache/cache-service";

type SettingsInput = import("zod").infer<
  typeof import("@/lib/validation/schemas").updateTenantSettingsSchema
>;

export async function getTenantSettings(tenantId: string) {
  const cacheKey = CacheKeys.tenantSettings(tenantId);
  const cached = await getCached<Awaited<ReturnType<typeof loadTenantSettings>>>(cacheKey);
  if (cached) return cached;

  const settings = await loadTenantSettings(tenantId);
  if (settings) {
    await setCached(cacheKey, settings, CacheTTL.settings);
  }
  return settings;
}

async function loadTenantSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });
  if (!tenant) return null;

  return {
    name: tenant.name,
    website: tenant.website,
    phone: tenant.phone,
    email: tenant.email,
    address: tenant.address,
    authorizedContact: tenant.settings?.authorizedContact ?? null,
    participationCertificate: tenant.settings?.participationCertificate ?? true,
    achievementCertificate: tenant.settings?.achievementCertificate ?? true,
    completionCertificate: tenant.settings?.completionCertificate ?? true,
    sendInvitationEmail: tenant.settings?.sendInvitationEmail ?? true,
    programStartReminder: tenant.settings?.programStartReminder ?? true,
    programEndReminder: tenant.settings?.programEndReminder ?? true,
    certificateNotification: tenant.settings?.certificateNotification ?? true,
    weeklyProgressNotification: tenant.settings?.weeklyProgressNotification ?? true,
  };
}

export async function updateTenantSettings(tenantId: string, input: SettingsInput) {
  const {
    authorizedContact,
    participationCertificate,
    achievementCertificate,
    completionCertificate,
    sendInvitationEmail,
    programStartReminder,
    programEndReminder,
    certificateNotification,
    weeklyProgressNotification,
    name,
    website,
    phone,
    email,
    address,
  } = input;

  // `await`, not `return`: returning the transaction here made the two lines
  // after it unreachable, so the function resolved to undefined. The route
  // then called Response.json(undefined), which throws — every save reported
  // failure even though the write had already committed, and the settings
  // cache was never invalidated.
  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(website !== undefined ? { website } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),
      },
    });

    const settingsData = {
      ...(authorizedContact !== undefined ? { authorizedContact } : {}),
      ...(participationCertificate !== undefined ? { participationCertificate } : {}),
      ...(achievementCertificate !== undefined ? { achievementCertificate } : {}),
      ...(completionCertificate !== undefined ? { completionCertificate } : {}),
      ...(sendInvitationEmail !== undefined ? { sendInvitationEmail } : {}),
      ...(programStartReminder !== undefined ? { programStartReminder } : {}),
      ...(programEndReminder !== undefined ? { programEndReminder } : {}),
      ...(certificateNotification !== undefined ? { certificateNotification } : {}),
      ...(weeklyProgressNotification !== undefined ? { weeklyProgressNotification } : {}),
    };

    if (Object.keys(settingsData).length > 0) {
      await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, ...settingsData },
        update: settingsData,
      });
    }
  });

  await invalidateCache(CacheKeys.tenantSettings(tenantId));
  return getTenantSettings(tenantId);
}
