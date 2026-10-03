import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));

import { checkFiles, detectType, safeFileName } from "@/lib/support/attachments";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = Buffer.from("%PDF-1.7\n");
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
const file = (name: string, bytes: Buffer | string, type = "") => new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name, { type });

describe("support attachments", () => {
  it("trusts a file's first bytes, not its name", () => {
    expect(detectType("screen.png", PNG)).toBe("image/png");
    expect(detectType("invoice.pdf", PDF)).toBe("application/pdf");
    // A program renamed to look like a picture or a document is refused.
    expect(detectType("photo.png", EXE)).toBeNull();
    expect(detectType("notes.txt", EXE)).toBeNull();
    // Formats a browser could run as a page are not on the list at all.
    expect(detectType("logo.svg", Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectType("page.html", Buffer.from("<html>"))).toBeNull();
  });

  it("keeps names readable but harmless", () => {
    expect(safeFileName('../../etc/"passwd"\r\n.txt')).toBe(".._.._etc_passwd_.txt");
    expect(safeFileName("Hesabat 2026.pdf")).toBe("Hesabat 2026.pdf");
    expect(safeFileName("   ")).toBe("file");
  });

  it("enforces how many files and how large", async () => {
    await expect(checkFiles(Array.from({ length: 6 }, (_, i) => file(`a${i}.png`, PNG)))).rejects.toMatchObject({ code: "TOO_MANY_FILES" });
    await expect(checkFiles([file("big.pdf", Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]))])).rejects.toMatchObject({ code: "FILE_TOO_LARGE", statusCode: 413 });
    await expect(checkFiles([file("evil.png", EXE)])).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED", statusCode: 415 });

    const ok = await checkFiles([file("screen.png", PNG), file("empty.txt", "")]);
    // Empty inputs (an untouched file field) are dropped, real files described by their content.
    expect(ok).toEqual([expect.objectContaining({ name: "screen.png", contentType: "image/png", size: PNG.length })]);
  });
});
