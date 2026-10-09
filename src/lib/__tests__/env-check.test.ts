import { describe, expect, it, vi } from "vitest";
import { validateEnv } from "@/lib/env-check";

const validProdEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@host:5432/db",
  AUTH_SECRET: "a".repeat(32),
  TOTP_ENCRYPTION_KEY: "b".repeat(32),
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  // Production resolves STORAGE_DRIVER to "s3", which requires a bucket.
  S3_DOCUMENTS_BUCKET: "bizsim-documents",
} as NodeJS.ProcessEnv;

describe("validateEnv", () => {
  it("passes with a fully configured production environment", () => {
    expect(() => validateEnv(validProdEnv)).not.toThrow();
  });

  it("throws in production when DATABASE_URL is missing and names the variable", () => {
    const env = { ...validProdEnv } as NodeJS.ProcessEnv;
    delete env.DATABASE_URL;
    expect(() => validateEnv(env)).toThrow(/DATABASE_URL is missing/);
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    const env = { ...validProdEnv } as NodeJS.ProcessEnv;
    delete env.AUTH_SECRET;
    expect(() => validateEnv(env)).toThrow(/AUTH_SECRET is missing/);
  });

  it("throws in production when Upstash Redis vars are missing", () => {
    const env = { ...validProdEnv } as NodeJS.ProcessEnv;
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    expect(() => validateEnv(env)).toThrow(
      /UPSTASH_REDIS_REST_URL is missing[\s\S]*UPSTASH_REDIS_REST_TOKEN is missing/
    );
  });

  it("accepts a single instance that opts out of Redis explicitly", () => {
    const env = {
      ...validProdEnv,
      ALLOW_IN_MEMORY_RATE_LIMIT: "true",
    } as NodeJS.ProcessEnv;
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("does not accept any value other than the exact opt-in string", () => {
    const env = {
      ...validProdEnv,
      ALLOW_IN_MEMORY_RATE_LIMIT: "1",
    } as NodeJS.ProcessEnv;
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    expect(() => validateEnv(env)).toThrow(/UPSTASH_REDIS_REST_URL is missing/);
  });

  it("throws when AUTH_SECRET is shorter than 32 characters", () => {
    const env = { ...validProdEnv, AUTH_SECRET: "short" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(/AUTH_SECRET must be at least 32/);
  });

  it("throws when a payment provider is half-configured", () => {
    const env = {
      ...validProdEnv,
      PAYTR_MERCHANT_ID: "123456",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(
      /PAYTR_MERCHANT_KEY is missing \(required because PAYTR_MERCHANT_ID is set\)/
    );
  });

  it("accepts a fully configured PayTR provider", () => {
    const env = {
      ...validProdEnv,
      PAYTR_MERCHANT_ID: "123456",
      PAYTR_MERCHANT_KEY: "merchant-key",
      PAYTR_MERCHANT_SALT: "merchant-salt",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("throws when a secret-looking NEXT_PUBLIC_ variable is present", () => {
    const env = {
      ...validProdEnv,
      NEXT_PUBLIC_API_SECRET: "leaked-secret",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(/NEXT_PUBLIC_API_SECRET looks like a secret/);
  });

  it("does not throw in development (warns instead)", () => {
    const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("is a no-op in test environment", () => {
    const env = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });

  // Certificates are issued documents. On ECS the container filesystem is
  // ephemeral, so a misconfigured driver loses them at the next deploy —
  // which is why this is a boot-time failure rather than a runtime surprise.
  describe("document storage", () => {
    it("requires a bucket when production defaults the driver to s3", () => {
      const env = { ...validProdEnv } as NodeJS.ProcessEnv;
      delete env.S3_DOCUMENTS_BUCKET;
      expect(() => validateEnv(env)).toThrow(/S3_DOCUMENTS_BUCKET is missing/);
    });

    it("requires a bucket when s3 is selected explicitly outside production", () => {
      const env = {
        NODE_ENV: "development",
        DATABASE_URL: "file:./dev.db",
        AUTH_SECRET: "a".repeat(32),
        STORAGE_DRIVER: "s3",
      } as NodeJS.ProcessEnv;
      // Development warns rather than throwing, so assert on the message.
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      validateEnv(env);
      expect(warn.mock.calls.join("\n")).toMatch(/S3_DOCUMENTS_BUCKET is missing/);
      warn.mockRestore();
    });

    it("does not ask for a bucket when the local driver is chosen", () => {
      const env = {
        ...validProdEnv,
        STORAGE_DRIVER: "local",
      } as NodeJS.ProcessEnv;
      delete env.S3_DOCUMENTS_BUCKET;
      expect(() => validateEnv(env)).not.toThrow();
    });

    it("warns that production on local disk will lose issued certificates", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      validateEnv({
        ...validProdEnv,
        STORAGE_DRIVER: "local",
      } as NodeJS.ProcessEnv);

      expect(warn.mock.calls.join("\n")).toMatch(/lost on the next deploy/);
      warn.mockRestore();
    });

    it("rejects a driver name that is neither local nor s3", () => {
      const env = { ...validProdEnv, STORAGE_DRIVER: "azure" } as NodeJS.ProcessEnv;
      expect(() => validateEnv(env)).toThrow(/STORAGE_DRIVER must be "local" or "s3"/);
    });
  });
});

/**
 * Live mode is the case worth failing fast on. A process that boots with
 * `PAYTR_MODE=live` and no live credentials passes its health check, takes
 * traffic, and fails only when a customer reaches the payment page.
 */
describe("validateEnv — PayTR mode", () => {
  const liveEnv = {
    ...validProdEnv,
    PAYTR_MODE: "live",
    PAYTR_LIVE_MERCHANT_ID: "live-id",
    PAYTR_LIVE_MERCHANT_KEY: "live-key",
    PAYTR_LIVE_MERCHANT_SALT: "live-salt",
  } as NodeJS.ProcessEnv;

  it("accepts a fully configured live environment", () => {
    expect(() => validateEnv(liveEnv)).not.toThrow();
  });

  it("refuses to boot in live mode without live credentials", () => {
    const env = { ...liveEnv } as NodeJS.ProcessEnv;
    delete env.PAYTR_LIVE_MERCHANT_KEY;

    expect(() => validateEnv(env)).toThrow(
      /PAYTR_LIVE_MERCHANT_KEY is missing \(required because PAYTR_MODE=live\)/
    );
  });

  it("does not accept the pre-split credentials as live ones", () => {
    const env = {
      ...validProdEnv,
      PAYTR_MODE: "live",
      PAYTR_MERCHANT_ID: "123456",
      PAYTR_MERCHANT_KEY: "merchant-key",
      PAYTR_MERCHANT_SALT: "merchant-salt",
    } as NodeJS.ProcessEnv;

    expect(() => validateEnv(env)).toThrow(/PAYTR_LIVE_MERCHANT_ID is missing/);
  });

  it("rejects an unrecognised mode", () => {
    const env = { ...validProdEnv, PAYTR_MODE: "production" } as NodeJS.ProcessEnv;

    expect(() => validateEnv(env)).toThrow(/PAYTR_MODE must be "sandbox" or "live"/);
  });

  it("requires an https app URL in live mode, because PayTR posts to it", () => {
    const env = {
      ...liveEnv,
      NEXT_PUBLIC_APP_URL: "http://app.example.com",
    } as NodeJS.ProcessEnv;

    expect(() => validateEnv(env)).toThrow(/NEXT_PUBLIC_APP_URL must be https/);
  });

  it("warns rather than fails when production is still pointed at the sandbox", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => validateEnv(validProdEnv)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("PAYTR_MODE=sandbox in production")
    );

    warn.mockRestore();
  });

  it("warns when live credentials are running in rehearsal mode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    validateEnv({ ...liveEnv, PAYTR_TEST_MODE: "1" } as NodeJS.ProcessEnv);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no money moves")
    );

    warn.mockRestore();
  });
});
