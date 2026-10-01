import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImageType, ImageRejectedError, sanitizeImage } from "@/ai/guard/image";

const pixel = (format: "jpeg" | "png" | "webp") =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 50, b: 50 } } })[format]().toBuffer();

describe("image guard", () => {
  it("recognises JPEG, PNG and WebP by their bytes", async () => {
    expect(detectImageType(await pixel("jpeg"))).toBe("image/jpeg");
    expect(detectImageType(await pixel("png"))).toBe("image/png");
    expect(detectImageType(await pixel("webp"))).toBe("image/webp");
  });

  it.each([
    ["SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["PDF", Buffer.from("%PDF-1.7\n1 0 obj")],
    ["DOCX (zip)", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
    ["GIF", Buffer.from("GIF89a")],
  ])("refuses %s whatever it is called", async (_, bytes) => {
    expect(detectImageType(bytes)).toBeNull();
    await expect(sanitizeImage(bytes, 1_000_000)).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("refuses files over the size limit", async () => {
    const jpeg = await pixel("jpeg");
    await expect(sanitizeImage(jpeg, jpeg.length - 1)).rejects.toMatchObject({ code: "AI_IMAGE_TOO_LARGE" });
  });

  it("strips EXIF and other metadata", async () => {
    const withExif = await sharp(await pixel("jpeg"))
      .withExif({ IFD0: { Artist: "Secret Person", Copyright: "Home address 12" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const clean = await sanitizeImage(withExif, 1_000_000);
    const meta = await sharp(clean.bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(clean.bytes.includes(Buffer.from("Secret Person"))).toBe(false);
  });

  it("drops data appended after the image", async () => {
    const polyglot = Buffer.concat([await pixel("png"), Buffer.from("<script>alert(1)</script>")]);
    const clean = await sanitizeImage(polyglot, 1_000_000);
    expect(clean.bytes.includes(Buffer.from("<script>"))).toBe(false);
  });
});
