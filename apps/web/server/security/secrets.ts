import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ensureServerEnv } from "@/server/env";

ensureServerEnv();

function key() {
  const encoded = process.env.SEACE_CREDENTIALS_KEY_V1;
  if (!encoded) throw new Error("SEACE_CREDENTIALS_KEY_V1 is not configured");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("SEACE_CREDENTIALS_KEY_V1 must contain 32 base64 bytes");
  return value;
}

export function encryptSecret(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string, context: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
