import { mkdtemp, readFile, readdir, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root = "";
vi.mock("@/lib/storage/local-adapter", async (original) => {
  const actual = await original<typeof import("@/lib/storage/local-adapter")>();
  return { ...actual, localPath: (key: string) => actual.localPath(key, root) };
});

import { parseRange, serveVideo, storeVideo, videoKeyFor } from "@/lib/lessons/video-file";

const streamOf = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }) as unknown as import("stream/web").ReadableStream<Uint8Array>;

describe("parseRange", () => {
  it("reads the forms a video player sends", () => {
    expect(parseRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("refuses ranges outside the file", () => {
    expect(parseRange("bytes=1000-", 1000)).toBeNull();
    expect(parseRange("bytes=5-2", 1000)).toBeNull();
    expect(parseRange(null, 1000)).toBeNull();
  });
});

describe("storing and serving a video on local disk", () => {
  beforeEach(async () => {
    vi.stubEnv("STORAGE_DRIVER", "local");
    root = await mkdtemp(path.join(os.tmpdir(), "lesson-video-"));
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it("only accepts video types", () => {
    expect(videoKeyFor("l1", "video/mp4")).toMatch(/^lesson-videos\/l1\/[\w-]+\.mp4$/);
    expect(() => videoKeyFor("l1", "text/html")).toThrow("UNSUPPORTED_TYPE");
  });

  it("serves byte ranges so the player can seek", async () => {
    const key = videoKeyFor("l1", "video/mp4");
    const bytes = new Uint8Array(Array.from({ length: 50 }, (_, i) => i));
    await storeVideo(key, streamOf(bytes), "video/mp4", bytes.length);

    const res = await serveVideo(key, "bytes=10-19");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 10-19/50");
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect((await serveVideo(key, "bytes=80-")).status).toBe(416);
  });

  it("drops an upload whose size does not match what was declared", async () => {
    const key = videoKeyFor("l1", "video/mp4");
    await expect(storeVideo(key, streamOf(new Uint8Array(30)), "video/mp4", 20)).rejects.toThrow("TOO_LARGE");
    await expect(storeVideo(key, streamOf(new Uint8Array(10)), "video/mp4", 20)).rejects.toThrow("INCOMPLETE");
    expect(await readdir(path.join(root, "lesson-videos", "l1"))).toEqual([]);
    await expect(readFile(path.join(root, key))).rejects.toThrow();
  });
});
