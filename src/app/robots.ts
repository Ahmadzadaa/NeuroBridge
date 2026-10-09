import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-url";

/**
 * Everything except the marketing pages is behind a login, so crawling it
 * produces nothing but redirect chains. The panels are disallowed explicitly
 * rather than left to the login redirect, so a crawler never queues them.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getAppOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/tenant/",
        "/*/participant/",
        "/*/super-admin/",
        "/*/teacher/",
        "/*/jury/",
        "/*/settings/",
        "/*/login",
        // Invite and application links are single-use and personal.
        "/*/apply/",
        "/*/join/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
