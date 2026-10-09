/**
 * Structured data for search engines.
 *
 * Rendered as a plain script tag rather than through a library: the payload is
 * built on the server from values we control, and shipping a JSON-LD package
 * to the browser for a static object would be pure weight on a page whose
 * whole point is loading fast.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // `<` is escaped so a value containing "</script>" cannot break out of
      // the tag. Everything here is our own copy today, but the pricing
      // payload reads plan names from the database.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function organizationJsonLd(params: {
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  contactEmail?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: params.name,
    description: params.description,
    url: params.url,
    logo: params.logoUrl,
    ...(params.contactEmail
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            email: params.contactEmail,
          },
        }
      : {}),
  };
}

export function productJsonLd(params: {
  name: string;
  description: string;
  url: string;
  offers: { name: string; price: number; currency: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: params.name,
    description: params.description,
    url: params.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: params.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      // Schema.org wants a decimal string, and the database stores integer
      // minor units (kuruş).
      price: (offer.price / 100).toFixed(2),
      priceCurrency: offer.currency,
      category: "SaaS subscription, per seat per month",
    })),
  };
}
