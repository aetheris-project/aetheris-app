/**
 * Unit tests for src/lib/crypto.ts.
 *
 * Run with: npm test
 */

import "./setup-env";

import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptCredential, decryptCredential } from "@/lib/crypto";

test("encrypt/decrypt round-trips a JSON value", async () => {
  const value = { url: "https://panel.example.com", token: "ptla_secret" };
  const payload = await encryptCredential(value);
  assert.ok(payload.startsWith("v1:"));

  const decrypted = await decryptCredential<typeof value>(payload);
  assert.deepEqual(decrypted, value);
});

test("payloads are unique per call (random salt and IV)", async () => {
  const value = { token: "same" };
  const first = await encryptCredential(value);
  const second = await encryptCredential(value);
  assert.notEqual(first, second);
});

test("malformed payload throws", async () => {
  await assert.rejects(() => decryptCredential("not-a-credential"));
});

test("tampered ciphertext fails authentication", async () => {
  const payload = await encryptCredential({ token: "hello" });
  const parts = payload.split(":");
  const data = parts[4];
  assert.ok(data, "payload must contain ciphertext");
  // Flip one hex nibble in the ciphertext so the GCM tag check must fail.
  const corrupted = data[0] === "0" ? `1${data.slice(1)}` : `0${data.slice(1)}`;
  const tampered = [parts[0], parts[1], parts[2], parts[3], corrupted].join(":");
  await assert.rejects(() => decryptCredential(tampered));
});
