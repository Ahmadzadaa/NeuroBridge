import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createS3Storage, resetS3RuntimeForTests } from "@/lib/storage/s3-adapter";

// The presigner is a plain function rather than a command, so it is mocked at
// the module level. Asserting on its arguments is how we check the TTL is
// actually passed through.
const presign = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: presign }));

const s3 = mockClient(S3Client);

const KEY = "certificates/tenant-1/user-2/cert-3.pdf";
const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  s3.reset();
  presign.mockReset();
  resetS3RuntimeForTests();
  process.env.S3_DOCUMENTS_BUCKET = "bizsim-docs-test";
  process.env.AWS_REGION = "eu-central-1";
});

afterEach(() => {
  delete process.env.S3_DOCUMENTS_BUCKET;
});

describe("s3 storage adapter", () => {
  it("puts the object into the configured bucket with its content type", async () => {
    s3.on(PutObjectCommand).resolves({});

    await createS3Storage().put(KEY, BYTES, "application/pdf");

    const calls = s3.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: "bizsim-docs-test",
      Key: KEY,
      ContentType: "application/pdf",
      ServerSideEncryption: "AES256",
    });
  });

  it("reads an object back as a Buffer", async () => {
    s3.on(GetObjectCommand).resolves({
      Body: { transformToByteArray: async () => BYTES },
    } as never);

    const result = await createS3Storage().get(KEY);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(new Uint8Array(result)).toEqual(BYTES);
  });

  it("fails loudly when the response carries no body", async () => {
    s3.on(GetObjectCommand).resolves({});

    await expect(createS3Storage().get(KEY)).rejects.toThrow(/Empty response body/);
  });

  it("reports a present object through HeadObject", async () => {
    s3.on(HeadObjectCommand).resolves({});

    expect(await createS3Storage().exists(KEY)).toBe(true);
    expect(s3.commandCalls(HeadObjectCommand)[0].args[0].input).toMatchObject({
      Bucket: "bizsim-docs-test",
      Key: KEY,
    });
  });

  it.each([
    ["NotFound", { name: "NotFound" }],
    ["NoSuchKey", { name: "NoSuchKey" }],
    ["a bare 404", { $metadata: { httpStatusCode: 404 } }],
  ])("treats %s as a missing object", async (_label, rejection) => {
    s3.on(HeadObjectCommand).rejects(rejection as never);

    expect(await createS3Storage().exists(KEY)).toBe(false);
  });

  // A permissions or networking failure must not be reported as "no such
  // object" — that would make the migration script skip rows silently.
  it("propagates a non-404 error from exists()", async () => {
    s3.on(HeadObjectCommand).rejects(
      Object.assign(new Error("Access Denied"), {
        name: "AccessDenied",
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(createS3Storage().exists(KEY)).rejects.toThrow("Access Denied");
  });

  it("deletes by key", async () => {
    s3.on(DeleteObjectCommand).resolves({});

    await createS3Storage().delete(KEY);

    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input).toMatchObject({
      Bucket: "bizsim-docs-test",
      Key: KEY,
    });
  });

  it("signs a URL for the requested lifetime", async () => {
    presign.mockResolvedValue("https://example.invalid/signed");

    const url = await createS3Storage().getSignedUrl(KEY, 300);

    expect(url).toBe("https://example.invalid/signed");
    expect(presign).toHaveBeenCalledTimes(1);
    const [, command, options] = presign.mock.calls[0];
    expect(command.input).toMatchObject({ Bucket: "bizsim-docs-test", Key: KEY });
    expect(options).toEqual({ expiresIn: 300 });
  });

  it("asks S3 to serve a readable filename when one is given", async () => {
    presign.mockResolvedValue("https://example.invalid/signed");

    await createS3Storage().getSignedUrl(KEY, 300, {
      downloadFileName: "BIZ-2026-DEM-000001.pdf",
    });

    expect(presign.mock.calls[0][1].input).toMatchObject({
      ResponseContentDisposition: 'inline; filename="BIZ-2026-DEM-000001.pdf"',
    });
  });

  // The filename lands in a signed header, so quotes and newlines must not
  // survive into it.
  it("strips characters that could break out of the disposition header", async () => {
    presign.mockResolvedValue("https://example.invalid/signed");

    await createS3Storage().getSignedUrl(KEY, 300, {
      downloadFileName: 'evil".pdf\r\nX-Injected: 1',
    });

    const disposition = presign.mock.calls[0][1].input.ResponseContentDisposition;
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).toBe('inline; filename="evil.pdfX-Injected 1"');
  });

  it("omits the disposition entirely when no filename is given", async () => {
    presign.mockResolvedValue("https://example.invalid/signed");

    await createS3Storage().getSignedUrl(KEY, 300);

    expect(presign.mock.calls[0][1].input).not.toHaveProperty(
      "ResponseContentDisposition",
    );
  });

  it("refuses to operate without a configured bucket", async () => {
    delete process.env.S3_DOCUMENTS_BUCKET;

    await expect(createS3Storage().put(KEY, BYTES, "application/pdf")).rejects.toThrow(
      /S3_DOCUMENTS_BUCKET is not set/,
    );
  });
});
