import { notFound } from "next/navigation";
import { getTenantFeatures, type TenantFeature } from "@/lib/tenant/features";

/**
 * Page-level module gate.
 *
 * Renders the 404 page when the organisation does not have the module, so a
 * disabled feature is indistinguishable from one that never existed — hiding
 * the menu entry alone would still leave the URL reachable.
 */
export async function requireFeature(
  tenantId: string | null | undefined,
  feature: TenantFeature
): Promise<void> {
  const features = await getTenantFeatures(tenantId);
  if (!features[feature]) {
    notFound();
  }
}
