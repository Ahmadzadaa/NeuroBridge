import { describe, expect, it } from "vitest";
import {
  getCallbackUrl,
  getPaytrCredentials,
  getPaytrMode,
  isLiveMode,
  isPaytrConfigured,
  missingPaytrVars,
} from "@/lib/payment/paytr/paytr.config";
import { PaymentConfigurationError } from "@/lib/payment/types";

const SANDBOX = {
  PAYTR_SANDBOX_MERCHANT_ID: "sandbox-id",
  PAYTR_SANDBOX_MERCHANT_KEY: "sandbox-key",
  PAYTR_SANDBOX_MERCHANT_SALT: "sandbox-salt",
} as unknown as NodeJS.ProcessEnv;

const LIVE = {
  PAYTR_LIVE_MERCHANT_ID: "live-id",
  PAYTR_LIVE_MERCHANT_KEY: "live-key",
  PAYTR_LIVE_MERCHANT_SALT: "live-salt",
} as unknown as NodeJS.ProcessEnv;

const LEGACY = {
  PAYTR_MERCHANT_ID: "legacy-id",
  PAYTR_MERCHANT_KEY: "legacy-key",
  PAYTR_MERCHANT_SALT: "legacy-salt",
} as unknown as NodeJS.ProcessEnv;

describe("PayTR mode selection", () => {
  it("defaults to sandbox when PAYTR_MODE is unset", () => {
    expect(getPaytrMode({} as unknown as NodeJS.ProcessEnv)).toBe("sandbox");
    expect(isLiveMode({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("rejects a mode that is neither sandbox nor live", () => {
    expect(() => getPaytrMode({ PAYTR_MODE: "production" } as unknown as NodeJS.ProcessEnv)).toThrow(
      PaymentConfigurationError
    );
  });

  it("accepts case and whitespace variations", () => {
    expect(getPaytrMode({ PAYTR_MODE: " LIVE " } as unknown as NodeJS.ProcessEnv)).toBe("live");
  });
});

describe("PayTR credential resolution", () => {
  it("reads sandbox credentials in sandbox mode", () => {
    const credentials = getPaytrCredentials({ ...SANDBOX } as unknown as NodeJS.ProcessEnv);

    expect(credentials.mode).toBe("sandbox");
    expect(credentials.merchantKey).toBe("sandbox-key");
    // Sandbox always runs as a test transaction; no money can move.
    expect(credentials.testMode).toBe(1);
  });

  it("still accepts the pre-split variables in sandbox mode", () => {
    const credentials = getPaytrCredentials({ ...LEGACY } as unknown as NodeJS.ProcessEnv);

    expect(credentials.merchantKey).toBe("legacy-key");
  });

  it("prefers the sandbox-prefixed variables over the legacy ones", () => {
    const credentials = getPaytrCredentials({
      ...LEGACY,
      ...SANDBOX,
    } as unknown as NodeJS.ProcessEnv);

    expect(credentials.merchantKey).toBe("sandbox-key");
  });

  it("reads live credentials in live mode", () => {
    const credentials = getPaytrCredentials({
      PAYTR_MODE: "live",
      ...LIVE,
    } as unknown as NodeJS.ProcessEnv);

    expect(credentials.mode).toBe("live");
    expect(credentials.merchantKey).toBe("live-key");
    expect(credentials.testMode).toBe(0);
  });

  /**
   * The failure this prevents: leftover sandbox keys in the environment
   * silently satisfying a live deployment, so every payment is a test and no
   * money is ever collected.
   */
  it("refuses to fall back to the legacy variables in live mode", () => {
    const env = { PAYTR_MODE: "live", ...LEGACY, ...SANDBOX } as unknown as NodeJS.ProcessEnv;

    expect(isPaytrConfigured(env)).toBe(false);
    expect(missingPaytrVars(env)).toEqual([
      "PAYTR_LIVE_MERCHANT_ID",
      "PAYTR_LIVE_MERCHANT_KEY",
      "PAYTR_LIVE_MERCHANT_SALT",
    ]);
    expect(() => getPaytrCredentials(env)).toThrow(/live mode/);
  });

  it("names only the variables that are actually missing", () => {
    const env = {
      PAYTR_MODE: "live",
      PAYTR_LIVE_MERCHANT_ID: "live-id",
    } as unknown as NodeJS.ProcessEnv;

    expect(missingPaytrVars(env)).toEqual([
      "PAYTR_LIVE_MERCHANT_KEY",
      "PAYTR_LIVE_MERCHANT_SALT",
    ]);
  });

  it("never leaks a credential value in the error message", () => {
    const env = { PAYTR_MODE: "live", ...LEGACY } as unknown as NodeJS.ProcessEnv;

    expect(() => getPaytrCredentials(env)).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("legacy-key"),
      })
    );
  });

  /** The go-live rehearsal: live account, live callback URL, no money moved. */
  it("allows an explicit test transaction while live", () => {
    const credentials = getPaytrCredentials({
      PAYTR_MODE: "live",
      PAYTR_TEST_MODE: "1",
      ...LIVE,
    } as unknown as NodeJS.ProcessEnv);

    expect(credentials.testMode).toBe(1);
  });

  it("ignores PAYTR_TEST_MODE=0 in sandbox mode", () => {
    const credentials = getPaytrCredentials({
      PAYTR_TEST_MODE: "0",
      ...SANDBOX,
    } as unknown as NodeJS.ProcessEnv);

    expect(credentials.testMode).toBe(1);
  });
});

describe("callback URL", () => {
  it("derives the notification URL registered with PayTR", () => {
    expect(
      getCallbackUrl({ NEXT_PUBLIC_APP_URL: "https://app.example.com" } as unknown as NodeJS.ProcessEnv)
    ).toBe("https://app.example.com/api/billing/paytr/callback");
  });

  it("tolerates a trailing slash", () => {
    expect(
      getCallbackUrl({ NEXT_PUBLIC_APP_URL: "https://app.example.com/" } as unknown as NodeJS.ProcessEnv)
    ).toBe("https://app.example.com/api/billing/paytr/callback");
  });
});
