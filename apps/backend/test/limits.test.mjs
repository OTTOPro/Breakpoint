import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_LIFETIME_MS, MIN_TIMING_MS, boundedMs } from "../src/limits.ts";

test("no request: the default applies", () => {
  assert.equal(boundedMs(undefined, 3_600_000, MAX_LIFETIME_MS), 3_600_000);
  assert.equal(boundedMs("long", 3_600_000, MAX_LIFETIME_MS), 3_600_000);
  assert.equal(boundedMs(Number.NaN, 3_600_000, MAX_LIFETIME_MS), 3_600_000);
});

test("a client cannot make a session outlive the cap", () => {
  assert.equal(boundedMs(365 * 24 * 3_600_000, 3_600_000, MAX_LIFETIME_MS), MAX_LIFETIME_MS);
  assert.equal(boundedMs(Number.POSITIVE_INFINITY, 3_600_000, MAX_LIFETIME_MS), 3_600_000);
});

test("shorter sessions are allowed, down to the floor", () => {
  assert.equal(boundedMs(1_500, 3_600_000, MAX_LIFETIME_MS), 1_500);
  assert.equal(boundedMs(0, 3_600_000, MAX_LIFETIME_MS), MIN_TIMING_MS);
  assert.equal(boundedMs(-5, 3_600_000, MAX_LIFETIME_MS), MIN_TIMING_MS);
});
