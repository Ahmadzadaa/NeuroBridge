import path from "path";
import { describe, expect, it } from "vitest";
import {
  AVATAR_ROOT,
  MAX_AVATAR_BYTES,
  contentTypeForPath,
  detectImageKind,
  resolveAvatarPath,
} from "@/lib/users/avatar-service";

/** Builds a buffer that starts with the given signature bytes. */
function withSignature(bytes: number[], length = 32): Buffer {
  const buffer = Buffer.alloc(length);
  Buffer.from(bytes).copy(buffer);
  return buffer;
}

const JPEG = withSignature([0xff, 0xd8, 0xff, 0xe0]);
const PNG = withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function webp(): Buffer {
  const buffer = Buffer.alloc(32);
  buffer.write("RIFF", 0, "latin1");
  buffer.write("WEBP", 8, "latin1");
  return buffer;
}

describe("detectImageKind", () => {
  it("recognises JPEG by its magic bytes", () => {
    expect(detectImageKind(JPEG)).toEqual({
      extension: "jpg",
      contentType: "image/jpeg",
    });
  });

  it("recognises PNG", () => {
    expect(detectImageKind(PNG)).toEqual({
      extension: "png",
      contentType: "image/png",
    });
  });

  it("recognises WebP", () => {
    expect(detectImageKind(webp())).toEqual({
      extension: "webp",
      contentType: "image/webp",
    });
  });

  it("rejects a PDF even though it is a real file type", () => {
    expect(detectImageKind(Buffer.from("%PDF-1.7 rest of file"))).toBeNull();
  });

  it("rejects an HTML payload disguised as an image", () => {
    // A .jpg filename with script content must not get through.
    expect(detectImageKind(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });

  it("rejects a buffer too short to identify", () => {
    expect(detectImageKind(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(detectImageKind(Buffer.alloc(0))).toBeNull();
  });

  it("rejects RIFF containers that are not WebP", () => {
    const wav = Buffer.alloc(32);
    wav.write("RIFF", 0, "latin1");
    wav.write("WAVE", 8, "latin1");
    expect(detectImageKind(wav)).toBeNull();
  });
});

describe("resolveAvatarPath", () => {
  it("resolves a normal stored filename inside the upload root", () => {
    const resolved = resolveAvatarPath("user123-abc.jpg");
    expect(resolved).toBe(path.resolve(AVATAR_ROOT, "user123-abc.jpg"));
  });

  it("refuses to escape the upload root via traversal", () => {
    expect(resolveAvatarPath("../../../etc/passwd")).toBeNull();
  });

  it("refuses a nested traversal", () => {
    expect(resolveAvatarPath("a/../../../secret.txt")).toBeNull();
  });

  it("refuses an absolute path", () => {
    const escaped = resolveAvatarPath(
      process.platform === "win32" ? "C:\\Windows\\system.ini" : "/etc/passwd"
    );
    expect(escaped).toBeNull();
  });
});

describe("contentTypeForPath", () => {
  it("maps each stored extension back to its type", () => {
    expect(contentTypeForPath("a.png")).toBe("image/png");
    expect(contentTypeForPath("a.webp")).toBe("image/webp");
    expect(contentTypeForPath("a.jpg")).toBe("image/jpeg");
  });

  it("falls back to JPEG for an unknown extension", () => {
    expect(contentTypeForPath("a.unknown")).toBe("image/jpeg");
  });
});

describe("size limit", () => {
  it("is 2 MB", () => {
    expect(MAX_AVATAR_BYTES).toBe(2 * 1024 * 1024);
  });
});
