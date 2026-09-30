import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import bcrypt from "bcryptjs";

const APP_NAME = "BizSim";
const RECOVERY_CODE_COUNT = 10;

function getEncryptionKey(): Buffer {
  const secret = process.env.TOTP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("TOTP_ENCRYPTION_KEY or AUTH_SECRET (32+ chars) required");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function getTotpUri(email: string, secret: string): string {
  return generateURI({ issuer: APP_NAME, label: email, secret });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return verifySync({ secret, token: code }).valid;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(5).toString("hex").toUpperCase()
  );
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, 12);
}

export async function verifyRecoveryCode(
  code: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Global 2FA switch. Off unless TWO_FACTOR_ENABLED=true: logins then need only
 * email + password, admins are not forced into setup, and codes are ignored
 * even for accounts that enabled 2FA earlier (their secrets are kept, so
 * turning the switch back on restores their second factor).
 */
export function isTwoFactorEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TWO_FACTOR_ENABLED === "true";
}

export function adminRequires2FA(role: string): boolean {
  return isTwoFactorEnabled() && (role === "SUPER_ADMIN" || role === "TENANT_ADMIN");
}
