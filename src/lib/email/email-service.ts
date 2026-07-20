import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  provider: "ses" | "console";
  messageId?: string;
  error?: string;
}

const DEV_EMAIL_DIR = path.join(process.cwd(), "uploads", "dev-emails");

function activeProvider(): "ses" | "console" {
  if (process.env.EMAIL_PROVIDER === "ses") return "ses";
  if (process.env.EMAIL_PROVIDER === "console") return "console";
  // Default: SES in production, console everywhere else.
  return process.env.NODE_ENV === "production" ? "ses" : "console";
}

async function sendViaSes(message: EmailMessage): Promise<EmailResult> {
  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { sent: false, provider: "ses", error: "EMAIL_FROM is not configured" };
  }

  const client = new SESv2Client({
    region: process.env.AWS_REGION ?? "eu-central-1",
  });

  const result = await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: {
        ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
      },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: message.html, Charset: "UTF-8" },
            ...(message.text
              ? { Text: { Data: message.text, Charset: "UTF-8" } }
              : {}),
          },
        },
      },
    })
  );

  return { sent: true, provider: "ses", messageId: result.MessageId };
}

/** Dev provider: logs the send and drops the HTML into uploads/dev-emails/. */
async function sendViaConsole(message: EmailMessage): Promise<EmailResult> {
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = message.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const fileName = `${stamp}-${slug}-${randomUUID().slice(0, 8)}.html`;

  try {
    await mkdir(DEV_EMAIL_DIR, { recursive: true });
    await writeFile(
      path.join(DEV_EMAIL_DIR, fileName),
      `<!-- to: ${recipients.join(", ")} -->\n${message.html}`,
      "utf8"
    );
  } catch {
    // Best effort — the console log below is the actual dev signal.
  }

  console.log(
    `📧 [dev-email] to=${recipients.join(",")} subject="${message.subject}" → uploads/dev-emails/${fileName}`
  );
  return { sent: true, provider: "console", messageId: fileName };
}

/**
 * Sends an email through the configured provider.
 * Never throws — notification failures must not break the main flow.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  try {
    return activeProvider() === "ses"
      ? await sendViaSes(message)
      : await sendViaConsole(message);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown email error";
    console.error(`Email send failed: ${msg}`);
    return { sent: false, provider: activeProvider(), error: msg };
  }
}
