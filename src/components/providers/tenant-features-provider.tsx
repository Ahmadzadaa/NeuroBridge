"use client";

import { createContext, useContext } from "react";
import {
  allFeatures,
  type TenantFeature,
  type TenantFeatureSet,
} from "@/lib/tenant/features";

/**
 * Which modules the signed-in user's organisation has.
 *
 * Used to hide navigation the tenant cannot use. This is presentation only —
 * every gated page also checks server-side, so a hidden entry is not the thing
 * keeping anyone out.
 */
const TenantFeaturesContext = createContext<TenantFeatureSet>(allFeatures());

export function TenantFeaturesProvider({
  features,
  children,
}: {
  features: TenantFeatureSet;
  children: React.ReactNode;
}) {
  return (
    <TenantFeaturesContext.Provider value={features}>
      {children}
    </TenantFeaturesContext.Provider>
  );
}

export function useTenantFeatures(): TenantFeatureSet {
  return useContext(TenantFeaturesContext);
}

export function useHasFeature(feature: TenantFeature | undefined): boolean {
  const features = useTenantFeatures();
  return feature === undefined ? true : features[feature];
}
