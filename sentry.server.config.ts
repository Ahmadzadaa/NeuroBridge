import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/monitoring/scrub-secrets";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: Boolean(process.env.SENTRY_DSN),
  // Payment credentials must never reach Sentry.
  beforeSend: (event) => scrubSentryEvent(event),
  beforeSendTransaction: (event) => scrubSentryEvent(event),
});
