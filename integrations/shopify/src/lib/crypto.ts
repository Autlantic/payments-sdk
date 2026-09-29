import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyBytes(): Buffer {
  const raw =
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.SHOPIFY_API_SECRET?.trim() ||
    "";
  if (!raw) {
    throw new Error("Set TOKEN_ENCRYPTION_KEY (or SHOPIFY_API_SECRET) to encrypt shop secrets");
  }
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a secret for DB storage. Format: v1:<ivHex>:<tagHex>:<cipherHex> */
export function encryptSecret(plain: string): string {
  const value = plain.trim();
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const raw = stored.trim();
  if (!raw) return "";
  if (!raw.startsWith("v1:")) {
    // Legacy / plaintext during migration.
    return raw;
  }
  const [, ivHex, tagHex, dataHex] = raw.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return v ? "••••" : "";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}
