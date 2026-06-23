#!/usr/bin/env node
/**
 * E2E for the device-identity endpoints (V2 Phase 1) against a live
 * `wrangler dev` with a local D1. No phone required.
 *
 *   BASE_URL=http://127.0.0.1:8787 node test/devices.test.mjs
 *
 * Prints the created deviceId + secret so the caller can verify the D1 row
 * (displayName changed, secret stored only as a hash).
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:8787";

let failures = 0;
function assert(name, cond, detail) {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// crypto.randomUUID is available in Node 20+
const deviceId = `dev-${crypto.randomUUID()}`;

async function main() {
  console.log(`Testing device identity at ${BASE}  (deviceId=${deviceId})`);

  console.log("\n(1) register — first call creates + issues a secret");
  const reg = await post("/devices/register", { deviceId, displayName: "Alpha" });
  assert("register returns 200", reg.status === 200, `status ${reg.status}`);
  const secret = reg.body.deviceSecret;
  assert("register emits a deviceSecret (hex)", /^[0-9a-f]{64}$/.test(secret ?? ""), secret);
  assert("register marks registered", reg.body.registered === true);

  console.log("\n(2) register again — re-announce, NO new secret");
  const reg2 = await post("/devices/register", { deviceId, displayName: "Alpha" });
  assert("re-register returns 200", reg2.status === 200, `status ${reg2.status}`);
  assert("re-register does NOT emit a secret", reg2.body.deviceSecret === undefined);

  console.log("\n(3) update with the RIGHT secret changes displayName");
  const upOk = await post("/devices/update", { deviceId, deviceSecret: secret, displayName: "Renamed" });
  assert("update ok with valid secret", upOk.status === 200 && upOk.body.ok === true, `status ${upOk.status}`);

  console.log("\n(4) update with a WRONG secret is rejected (403)");
  const upBad = await post("/devices/update", { deviceId, deviceSecret: "deadbeef".repeat(8), displayName: "Hacked" });
  assert("wrong secret → 403", upBad.status === 403, `status ${upBad.status}, error=${upBad.body.error}`);

  console.log("\n(5) update with NO secret is rejected (401)");
  const upNo = await post("/devices/update", { deviceId, displayName: "Hacked" });
  assert("missing secret → 401", upNo.status === 401, `status ${upNo.status}, error=${upNo.body.error}`);

  console.log("\n(6) update of an unknown device → 404");
  const upMissing = await post("/devices/update", { deviceId: "nope", deviceSecret: secret, displayName: "X" });
  assert("unknown device → 404", upMissing.status === 404, `status ${upMissing.status}`);

  console.log("\n=================== SUMMARY ===================");
  console.log(`DEVICE_ID=${deviceId}`);
  console.log(`DEVICE_SECRET=${secret}`);
  if (failures > 0) {
    console.log(`RESULT: FAIL (${failures} failing assertions)`);
    process.exit(1);
  }
  console.log("RESULT: PASS — register/update/secret behaviours proven.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Test crashed:", e);
  process.exit(1);
});
