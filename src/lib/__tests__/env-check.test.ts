import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env-check";

const validProdEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@host:5432/db",
  AUTH_SECRET: "a".repeat(32),
  TOTP_ENCRYPTION_KEY: "b".repeat(32),
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
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

  it("throws when AUTH_SECRET is shorter than 32 characters", () => {
    const env = { ...validProdEnv, AUTH_SECRET: "short" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(/AUTH_SECRET must be at least 32/);
  });

  it("throws when a payment provider is half-configured", () => {
    const env = {
      ...validProdEnv,
      STRIPE_SECRET_KEY: "sk_test_placeholder",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(
      /STRIPE_WEBHOOK_SECRET is missing \(required because STRIPE_SECRET_KEY is set\)/
    );
  });

  it("throws when a secret-looking NEXT_PUBLIC_ variable is present", () => {
    const env = {
      ...validProdEnv,
      NEXT_PUBLIC_API_SECRET: "leaked-secret",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).toThrow(/NEXT_PUBLIC_API_SECRET looks like a secret/);
  });

  it("allows the Stripe publishable key as NEXT_PUBLIC_", () => {
    const env = {
      ...validProdEnv,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_placeholder",
    } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("does not throw in development (warns instead)", () => {
    const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("is a no-op in test environment", () => {
    const env = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
    expect(() => validateEnv(env)).not.toThrow();
  });
});
