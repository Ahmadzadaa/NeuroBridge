import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIGNED_URL_TTL,
  activeDriver,
  signedUrlTtl,
} from "@/lib/storage";
import { certificateKey, exportKey } from "@/lib/storage/keys";

/** NODE_ENV is required on ProcessEnv, so a partial needs widening. */
const env = (values: Record<string, string | undefined>): NodeJS.ProcessEnv =>
  values as unknown as NodeJS.ProcessEnv;

describe("driver selection", () => {
  it("honours an explicit setting", () => {
    expect(activeDriver(env({ STORAGE_DRIVER: "s3" }))).toBe("s3");
    expect(activeDriver(env({ STORAGE_DRIVER: "local" }))).toBe(
      "local",
    );
  });

  // The failure this module exists to prevent is a production deploy quietly
  // writing issued certificates to an ephemeral container filesystem.
  it("defaults production to s3 and everything else to local", () => {
    expect(activeDriver(env({ NODE_ENV: "production" }))).toBe("s3");
    expect(activeDriver(env({ NODE_ENV: "development" }))).toBe(
      "local",
    );
    expect(activeDriver(env({}))).toBe("local");
  });

  it("lets an explicit local setting override the production default", () => {
    expect(
      activeDriver(env({
        NODE_ENV: "production",
        STORAGE_DRIVER: "local",
      })),
    ).toBe("local");
  });
});

describe("signed url ttl", () => {
  it("reads a positive integer from the environment", () => {
    expect(signedUrlTtl(env({ STORAGE_SIGNED_URL_TTL: "120" }))).toBe(
      120,
    );
  });

  it.each(["", "0", "-5", "abc", undefined])(
    "falls back to the default for %s",
    (value) => {
      expect(
        signedUrlTtl(env({ STORAGE_SIGNED_URL_TTL: value })),
      ).toBe(DEFAULT_SIGNED_URL_TTL);
    },
  );
});

describe("key layout", () => {
  it("groups a certificate under tenant and user", () => {
    expect(certificateKey("t1", "u2", "c3")).toBe("certificates/t1/u2/c3.pdf");
  });

  it("keeps exports in their own prefix so they can expire separately", () => {
    expect(exportKey("t1", "job9")).toBe("exports/t1/job9.zip");
  });
});
