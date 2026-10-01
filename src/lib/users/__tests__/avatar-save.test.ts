import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const written = vi.hoisted(() => ({ files: new Map<string, Buffer>() }));
vi.mock("fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  unlink: vi.fn(async () => undefined),
  writeFile: vi.fn(async (file: string, data: Buffer) => void written.files.set(file, data)),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(async () => ({ avatarPath: null })), update: vi.fn(async () => ({})) } },
}));

import { InvalidAvatarError, saveAvatar } from "@/lib/users/avatar-service";

const photo = async () =>
  sharp({ create: { width: 2000, height: 1200, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .withExif({ IFD0: { Artist: "Secret Person", Copyright: "Home address 12" } })
    .jpeg()
    .toBuffer();

describe("saveAvatar", () => {
  beforeEach(() => written.files.clear());

  it("stores a small square WebP without the photo's metadata", async () => {
    const original = await photo();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const result = await saveAvatar("u1", new File([new Uint8Array(original)], "me.jpg", { type: "image/jpeg" }));
    expect(result.storedPath).toMatch(/^u1-.*\.webp$/);
    expect(result.contentType).toBe("image/webp");

    const stored = [...written.files.values()][0];
    const meta = await sharp(stored).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 512, 512]);
    expect(meta.exif).toBeUndefined();
    expect(stored.includes(Buffer.from("Secret Person"))).toBe(false);
  });

  it("refuses bytes that only look like an image", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    await expect(saveAvatar("u1", new File([new Uint8Array(fake)], "x.jpg"))).rejects.toBeInstanceOf(InvalidAvatarError);
    expect(written.files.size).toBe(0);
  });
});
