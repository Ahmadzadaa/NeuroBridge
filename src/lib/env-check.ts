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
  "NEXT_PUBLIC_APP_URL",
] as const;

/**
 * Rate limiting is backed by Upstash Redis in production because the in-memory
 * limiter counts per process: behind two instances a caller gets twice the
 * allowance, which is a real weakness rather than a rough edge.
 *
 * A single-instance deployment does not have that problem, and neither does a
 * local production run. `ALLOW_IN_MEMORY_RATE_LIMIT=true` is the explicit way
 * to say so — it has to be typed out deliberately, and it warns on every boot.
 */
const REDIS_VARS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;

export function inMemoryRateLimitAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_IN_MEMORY_RATE_LIMIT === "true";
}

// PayTR is an optional integration, but a half-configured provider would only
// fail when a customer reaches checkout — so the three credentials must be set
// together or not at all. This covers the pre-split (sandbox-only) triple;
// mode-specific credentials are checked in `checkPaytr` below.
const PAIRED_PROVIDER_VARS: Record<string, string[]> = {
  PAYTR_MERCHANT_ID: ["PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"],
  PAYTR_SANDBOX_MERCHANT_ID: [
    "PAYTR_SANDBOX_MERCHANT_KEY",
    "PAYTR_SANDBOX_MERCHANT_SALT",
  ],
  PAYTR_LIVE_MERCHANT_ID: ["PAYTR_LIVE_MERCHANT_KEY", "PAYTR_LIVE_MERCHANT_SALT"],
};

const PAYTR_LIVE_VARS = [
  "PAYTR_LIVE_MERCHANT_ID",
  "PAYTR_LIVE_MERCHANT_KEY",
  "PAYTR_LIVE_MERCHANT_SALT",
] as const;

/**
 * Payment configuration is checked at boot rather than at checkout.
 *
 * Live mode is the case that matters: a process that starts with `PAYTR_MODE=live`
 * and no live credentials would look healthy, pass its health check, take
 * traffic, and fail only when a customer reached the payment page — with a
 * generic 503 that says nothing about which variable is missing. Refusing to
 * start is louder and cheaper.
 *
 * Nothing here reads a credential's value, only whether it is present, so a
 * failure message can be pasted into a ticket.
 */
function checkPaytr(env: NodeJS.ProcessEnv, problems: string[]): void {
  const rawMode = (env.PAYTR_MODE ?? "sandbox").trim().toLowerCase();

  if (rawMode !== "sandbox" && rawMode !== "live") {
    problems.push(`PAYTR_MODE must be "sandbox" or "live" (got "${env.PAYTR_MODE}")`);
    return;
  }

  if (rawMode === "live") {
    for (const key of PAYTR_LIVE_VARS) {
      if (!env[key]) {
        problems.push(`${key} is missing (required because PAYTR_MODE=live)`);
      }
    }

    // The unprefixed triple is ignored in live mode on purpose — nothing about
    // the name says whether it holds a sandbox or a production key. Say so,
    // because "I set the PayTR keys" is otherwise a reasonable belief.
    if (env.PAYTR_MERCHANT_KEY) {
      console.warn(
        "⚠️  PAYTR_MERCHANT_* is set but ignored while PAYTR_MODE=live: live " +
          "credentials are read only from PAYTR_LIVE_MERCHANT_*."
      );
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
    if (appUrl && !appUrl.startsWith("https://")) {
      problems.push(
        `NEXT_PUBLIC_APP_URL must be https in live mode (got "${appUrl}") — ` +
          "PayTR posts the payment notification to it"
      );
    }

    if (env.PAYTR_TEST_MODE === "1") {
      console.warn(
        "⚠️  PAYTR_MODE=live with PAYTR_TEST_MODE=1: live credentials, but every " +
          "charge is a test and no money moves. Intended only for the go-live " +
          "rehearsal — unset PAYTR_TEST_MODE to take real payments."
      );
    }
  }

  if (env.NODE_ENV === "production" && rawMode === "sandbox") {
    console.warn(
      "⚠️  PAYTR_MODE=sandbox in production: payments are routed to the PayTR " +
        "sandbox and no money will be collected."
    );
  }

  if (env.PAYTR_NON3D_ENABLED === "1" && rawMode === "sandbox") {
    console.warn(
      "⚠️  PAYTR_NON3D_ENABLED=1 in sandbox mode: automatic card charging will " +
        "be attempted against sandbox credentials."
    );
  }
}

const MIN_SECRET_LENGTH = 32;

/**
 * Certificates are issued documents, not cache. On ECS the container
 * filesystem is ephemeral, so a deployment left on the local driver loses
 * every certificate it has issued at the next deploy — silently, because
 * writing to disk succeeds. This is checked at boot rather than discovered
 * later by a participant whose certificate no longer opens.
 */
function checkStorage(env: NodeJS.ProcessEnv, problems: string[]): void {
  const explicit = env.STORAGE_DRIVER;
  if (explicit && explicit !== "local" && explicit !== "s3") {
    problems.push(`STORAGE_DRIVER must be "local" or "s3" (got "${explicit}")`);
    return;
  }

  const isProduction = env.NODE_ENV === "production";
  const driver = explicit ?? (isProduction ? "s3" : "local");

  if (driver === "s3" && !env.S3_DOCUMENTS_BUCKET) {
    problems.push(
      "S3_DOCUMENTS_BUCKET is missing (required because STORAGE_DRIVER resolves to 's3')"
    );
  }

  if (isProduction && driver === "local") {
    console.warn(
      "⚠️  STORAGE_DRIVER=local in production: issued certificates are written " +
        "to the container filesystem and will be lost on the next deploy."
    );
  }
}

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

    if (inMemoryRateLimitAllowed(env)) {
      console.warn(
        "⚠️  ALLOW_IN_MEMORY_RATE_LIMIT is on: rate limits are counted per " +
          "process. Safe for a single instance only — never behind a load balancer."
      );
    } else {
      for (const key of REDIS_VARS) {
        if (!env[key]) {
          problems.push(
            `${key} is missing (required in production, or set ALLOW_IN_MEMORY_RATE_LIMIT=true for a single-instance deployment)`
          );
        }
      }
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

  checkStorage(env, problems);
  checkPaytr(env, problems);

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
