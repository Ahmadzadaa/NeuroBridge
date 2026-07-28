/**
 * Startup environment validation.
 *
 * Fails fast (refuses to boot) when a required variable is missing or unsafe,
 * instead of failing at runtime deep inside a feature. Called from
 * `src/instrumentation.ts` on the Node.js runtime.
 */

const REQUIRED_ALWAYS = ["DATABASE_URL", "AUTH_SECRET"] as const;

const REQUIRED_IN_PRODUCTION = [
  "TOTP_ENCRYPTION_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_APP_URL",
] as const;

// PayTR is an optional integration, but a half-configured provider would only
// fail when a customer reaches checkout — so the three credentials must be set
// together or not at all.
const PAIRED_PROVIDER_VARS: Record<string, string[]> = {
  PAYTR_MERCHANT_ID: ["PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"],
};

const MIN_SECRET_LENGTH = 32;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === "test") return;

  const problems: string[] = [];
  const isProduction = env.NODE_ENV === "production";

  for (const key of REQUIRED_ALWAYS) {
    if (!env[key]) problems.push(`${key} is missing`);
  }

  if (isProduction) {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key]) problems.push(`${key} is missing (required in production)`);
    }
  }

  if (env.AUTH_SECRET && env.AUTH_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (
    env.TOTP_ENCRYPTION_KEY &&
    env.TOTP_ENCRYPTION_KEY.length < MIN_SECRET_LENGTH
  ) {
    problems.push(
      `TOTP_ENCRYPTION_KEY must be at least ${MIN_SECRET_LENGTH} characters`
    );
  }

  for (const [primary, dependents] of Object.entries(PAIRED_PROVIDER_VARS)) {
    if (env[primary]) {
      for (const dependent of dependents) {
        if (!env[dependent]) {
          problems.push(`${dependent} is missing (required because ${primary} is set)`);
        }
      }
    }
  }

  // Guard against secrets accidentally exposed to the client bundle. PayTR has
  // no browser-side key, so there is nothing to allow-list here.
  const clientExposedSecrets = Object.keys(env).filter(
    (key) =>
      key.startsWith("NEXT_PUBLIC_") &&
      /(SECRET|PRIVATE|PASSWORD|_KEY$|TOKEN)/i.test(key.replace("NEXT_PUBLIC_", ""))
  );
  for (const key of clientExposedSecrets) {
    problems.push(
      `${key} looks like a secret but NEXT_PUBLIC_ variables are exposed to the browser`
    );
  }

  if (problems.length > 0) {
    const message = `Environment validation failed:\n  - ${problems.join("\n  - ")}`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`⚠️  ${message}`);
  }
}
