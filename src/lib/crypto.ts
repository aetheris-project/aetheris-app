/**
 * AES-256-GCM encryption for hypervisor credentials at rest.
 *
 * The master key is derived from AETHERIS_SECRET with scrypt and a random
 * salt persisted in the same payload, so rotating AETHERIS_SECRET re-encrypts
 * cleanly and no key material is stored alongside the ciphertext.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "@/lib/config/env";

const ALGORITHM = "aes-256-gcm";
const KEY_SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * Encrypt a JSON-serializable value. Returns
 * `v1:<salt>:<iv>:<authTag>:<ciphertext>` (all hex).
 */
export async function encryptCredential(value: unknown): Promise<string> {
  const salt = randomBytes(KEY_SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = scryptSync(env.AETHERIS_SECRET, salt, 32);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex")
  ].join(":");
}

/** Decrypt a value produced by encryptCredential. */
export async function decryptCredential<T = unknown>(payload: string): Promise<T> {
  const [version, saltHex, ivHex, tagHex, dataHex] = payload.split(":");
  if (version !== "v1" || !saltHex || !ivHex || !tagHex || !dataHex) {
    throw new Error("unsupported or malformed credential payload");
  }

  const key = scryptSync(env.AETHERIS_SECRET, Buffer.from(saltHex, "hex"), 32);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
