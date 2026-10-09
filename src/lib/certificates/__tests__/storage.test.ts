import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageAdapter } from "@/lib/storage/types";

// An in-memory adapter stands in for the driver: this file is about the
// certificate-specific layer (key layout, hashing, legacy paths), not about
// how bytes reach disk or S3.
const objects = new Map<string, Uint8Array>();

const fake: StorageAdapter = {
  put: vi.fn(async (key: string, body: Uint8Array) => {
    objects.set(key, body);
  }),
  get: vi.fn(async (key: string) => {
    const found = objects.get(key);
    if (!found) throw new Error(`no such key: ${key}`);
    return Buffer.from(found);
  }),
  getSignedUrl: vi.fn(
    async (key: string, ttl: number, options?: { downloadFileName?: string }) =>
      `signed:${key}:${ttl}:${options?.downloadFileName ?? "-"}`,
  ),
  delete: vi.fn(async (key: string) => {
    objects.delete(key);
  }),
  exists: vi.fn(async (key: string) => objects.has(key)),
};

vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  getStorage: () => fake,
}));

const {
  getCertificatePdfUrl,
  readCertificatePdf,
  resolveCertificateKey,
  storeCertificatePdf,
} = await import("@/lib/certificates/storage");

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  objects.clear();
  vi.clearAllMocks();
});

describe("certificate key resolution", () => {
  it("passes through a key already in the current layout", () => {
    expect(resolveCertificateKey("certificates/t1/u2/c3.pdf")).toBe(
      "certificates/t1/u2/c3.pdf",
    );
  });

  // Rows written before object storage hold a path relative to the
  // certificates directory. They must keep opening until the migration runs.
  it("prefixes a legacy relative path", () => {
    expect(resolveCertificateKey("t1/c3.pdf")).toBe("certificates/t1/c3.pdf");
  });

  // path.join produced these on Windows, so they are in real databases.
  it("normalises backslashes from legacy Windows rows", () => {
    expect(resolveCertificateKey("t1\\c3.pdf")).toBe("certificates/t1/c3.pdf");
  });
});

describe("storing a certificate", () => {
  it("writes under tenant and user, and returns the content hash", async () => {
    const stored = await storeCertificatePdf({
      tenantId: "t1",
      userId: "u2",
      certificateId: "c3",
      bytes: BYTES,
    });

    expect(stored.key).toBe("certificates/t1/u2/c3.pdf");
    expect(stored.hash).toBe(createHash("sha256").update(BYTES).digest("hex"));
    expect(fake.put).toHaveBeenCalledWith(stored.key, BYTES, "application/pdf");
  });

  it("reads back exactly what was written", async () => {
    const { key } = await storeCertificatePdf({
      tenantId: "t1",
      userId: "u2",
      certificateId: "c3",
      bytes: BYTES,
    });

    expect(new Uint8Array(await readCertificatePdf(key))).toEqual(BYTES);
  });

  it("reads a legacy row through the same call", async () => {
    objects.set("certificates/t1/c3.pdf", BYTES);

    expect(new Uint8Array(await readCertificatePdf("t1/c3.pdf"))).toEqual(BYTES);
  });
});

describe("signed download URL", () => {
  it("asks the driver for the resolved key", async () => {
    const url = await getCertificatePdfUrl("t1/c3.pdf", {
      ttlSeconds: 300,
      fileName: "BIZ-2026-DEM-000001.pdf",
    });

    expect(url).toBe(
      "signed:certificates/t1/c3.pdf:300:BIZ-2026-DEM-000001.pdf",
    );
  });

  it("passes null through when the driver cannot presign", async () => {
    vi.mocked(fake.getSignedUrl).mockResolvedValueOnce(null);

    expect(await getCertificatePdfUrl("certificates/t1/u2/c3.pdf")).toBeNull();
  });
});
