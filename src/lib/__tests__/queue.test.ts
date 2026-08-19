/**
 * Unit tests for src/lib/queue.ts queue registry.
 *
 * Run with: npm test
 */

import "./setup-env";

import { test } from "node:test";
import assert from "node:assert/strict";
import { QUEUE_NAMES } from "@/lib/queue";

test("queue names are unique and namespaced", () => {
  const names = Object.values(QUEUE_NAMES);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) {
    assert.ok(name.startsWith("aetheris."), `${name} must be namespaced`);
  }
});

test("every queue name maps to a known domain", () => {
  const expected = ["billing", "email", "provisioning", "telemetry", "webhooks"].sort();
  assert.deepEqual(
    Object.values(QUEUE_NAMES).map((name) => name.replace("aetheris.", "")).sort(),
    expected
  );
});
