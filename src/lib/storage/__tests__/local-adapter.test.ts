import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorage } from "@/lib/storage/local-adapter";
import type { StorageAdapter } from "@/lib/storage/types";

// A real directory, not a mocked fs: the point of this adapter is that it
// actually touches the filesystem correctly, including creating nested
// directories that do not exist yet.
let root: string;
let storage: StorageAdapter;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "bizsim-storage-"));
  storage = createLocalStorage(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const KEY = "certificates/tenant-1/user-2/cert-3.pdf";
const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

describe("local storage adapter", () => {
  it("writes through a nested key that does not exist yet", async () => {
    await storage.put(KEY, BYTES, "application/pdf");

    const written = await readFile(path.join(root, KEY));
    expect(new Uint8Array(written)).toEqual(BYTES);
  });

  it("round-trips put → exists → get → delete", async () => {
    expect(await storage.exists(KEY)).toBe(false);

    await storage.put(KEY, BYTES, "application/pdf");
    expect(await storage.exists(KEY)).toBe(true);
    expect(new Uint8Array(await storage.get(KEY))).toEqual(BYTES);

    await storage.delete(KEY);
    expect(await storage.exists(KEY)).toBe(false);
  });

  it("treats deleting a missing object as success, so re-runs are idempotent", async () => {
    await expect(storage.delete(KEY)).resolves.toBeUndefined();
  });

  it("overwrites an existing object rather than appending", async () => {
    await storage.put(KEY, BYTES, "application/pdf");
    await storage.put(KEY, new Uint8Array([1, 2]), "application/pdf");

    expect(new Uint8Array(await storage.get(KEY))).toEqual(new Uint8Array([1, 2]));
  });

  it("reports a missing object rather than throwing from exists()", async () => {
    expect(await storage.exists("certificates/nope/none/missing.pdf")).toBe(false);
  });

  // A tampered Certificate.pdfPath must not be able to read or write outside
  // the storage root.
  it.each([
    "../../etc/passwd",
    "certificates/../../../secrets.env",
  ])("refuses a key that escapes the root: %s", async (key) => {
    await expect(storage.get(key)).rejects.toThrow(/escapes the storage root/);
    await expect(storage.put(key, BYTES, "application/pdf")).rejects.toThrow(
      /escapes the storage root/,
    );
  });

  it("cannot presign, and says so instead of inventing a URL", async () => {
    expect(await storage.getSignedUrl(KEY, 300)).toBeNull();
  });
});
