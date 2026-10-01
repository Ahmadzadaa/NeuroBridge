import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

/** Sentry's ingest host, when browser error reporting is configured. */
function sentryOrigin(): string {
  try {
    return process.env.NEXT_PUBLIC_SENTRY_DSN ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).origin : "";
  } catch {
    return "";
  }
}

/**
 * Content Security Policy. Images and network requests stay on this origin, so
 * nothing in a page (including an AI reply) can load a remote image or send
 * data elsewhere. Frames are limited to the video hosts used by trainings,
 * the private file bucket and the payment provider.
 *
 * script-src keeps 'unsafe-inline' for Next.js's inline bootstrap scripts: a
 * nonce-based policy needs every page rendered dynamically and the nonce
 * threaded through the next-intl proxy, which is a separate change.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${sentryOrigin() ? ` ${sentryOrigin()}` : ""}${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "frame-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://*.amazonaws.com https://www.paytr.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paytr.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig = {
  output: "standalone" as const,
  images: {
    remotePatterns: [{ protocol: "https" as const, hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
