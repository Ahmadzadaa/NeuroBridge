import { beforeEach, describe, expect, it, vi } from "vitest";
import { leadSchema, parseBody } from "@/lib/validation/schemas";
import { ValidationError } from "@/lib/auth/permissions";

const created = vi.fn();
const sent = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        created(args.data);
        return { id: "lead-1", createdAt: new Date("2026-09-06T10:00:00.000Z") };
      }),
    },
  },
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: vi.fn((message: { to: string }) => {
    sent(message);
    return { sent: true, provider: "console", messageId: "m1" };
  }),
}));

const { createLead, notificationRecipient } = await import("@/lib/leads/lead-service");

const VALID = {
  name: "Aysel Ahmadova",
  company: "Demo Teknopark",
  email: "aysel@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  created.mockClear();
  sent.mockClear();
  process.env.LEADS_NOTIFICATION_EMAIL = "sales@example.com";
});

describe("lead validation", () => {
  it("accepts a minimal submission", () => {
    const parsed = parseBody(leadSchema, VALID);
    expect(parsed.name).toBe("Aysel Ahmadova");
    expect(parsed.email).toBe("aysel@example.com");
  });

  it("lowercases and trims the email so duplicates are comparable", () => {
    const parsed = parseBody(leadSchema, { ...VALID, email: "  Aysel@Example.COM " });
    expect(parsed.email).toBe("aysel@example.com");
  });

  it.each([
    ["a missing name", { ...VALID, name: "" }],
    ["a missing company", { ...VALID, company: "" }],
    ["a malformed email", { ...VALID, email: "not-an-email" }],
  ])("rejects %s", (_label, input) => {
    expect(() => parseBody(leadSchema, input)).toThrow(ValidationError);
  });

  // The form is public, so the schema is the whole input boundary.
  it("rejects angle brackets anywhere in free text", () => {
    expect(() =>
      parseBody(leadSchema, { ...VALID, message: "<script>alert(1)</script>" }),
    ).toThrow(ValidationError);
    expect(() =>
      parseBody(leadSchema, { ...VALID, name: "<img src=x>" }),
    ).toThrow(ValidationError);
  });

  it("caps the message so the form cannot be used as free storage", () => {
    expect(() =>
      parseBody(leadSchema, { ...VALID, message: "a".repeat(2001) }),
    ).toThrow(ValidationError);
  });

  it("accepts the honeypot field so the route can inspect it", () => {
    const parsed = parseBody(leadSchema, { ...VALID, website: "http://spam.example" });
    expect(parsed.website).toBe("http://spam.example");
  });
});

describe("createLead", () => {
  it("stores the submission and notifies sales", async () => {
    const result = await createLead({ ...VALID, locale: "az" });

    expect(result).toMatchObject({ id: "lead-1", notified: true });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ name: VALID.name, company: VALID.company, locale: "az" }),
    );
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ to: "sales@example.com" }),
    );
  });

  it("falls back to the routing default for an unknown language", async () => {
    await createLead({ ...VALID, locale: "de" });
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ locale: "tr" }));
  });

  it("normalises absent optional fields to null rather than undefined", async () => {
    await createLead(VALID);
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, seatCount: null, message: null }),
    );
  });

  // The visitor did their part; a broken mailbox must not lose the lead.
  it("still reports success when the notification fails", async () => {
    const { sendEmail } = await import("@/lib/email/email-service");
    vi.mocked(sendEmail).mockResolvedValueOnce({
      sent: false,
      provider: "ses",
      error: "SES down",
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createLead(VALID);

    expect(result.id).toBe("lead-1");
    expect(result.notified).toBe(false);
    expect(created).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("still stores the lead when no recipient is configured", async () => {
    delete process.env.LEADS_NOTIFICATION_EMAIL;
    delete process.env.EMAIL_FROM;
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createLead(VALID);

    expect(result.notified).toBe(false);
    expect(created).toHaveBeenCalledTimes(1);
    expect(sent).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("notificationRecipient", () => {
  it("prefers the dedicated address over the sender identity", () => {
    process.env.LEADS_NOTIFICATION_EMAIL = "sales@example.com";
    process.env.EMAIL_FROM = "no-reply@example.com";
    expect(notificationRecipient()).toBe("sales@example.com");
  });

  it("falls back to the sender identity rather than dropping the lead", () => {
    delete process.env.LEADS_NOTIFICATION_EMAIL;
    process.env.EMAIL_FROM = "no-reply@example.com";
    expect(notificationRecipient()).toBe("no-reply@example.com");
  });
});
