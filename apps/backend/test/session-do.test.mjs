#!/usr/bin/env node
/**
 * End-to-end test for the Session Durable Object (step 2.1).
 *
 * Runs against a live `wrangler dev` instance and proves criteria 1–7 from
 * docs/breakpoint_step2_01_session_do.md. No phone required.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:8787 node test/session-do.test.mjs
 *
 * Requires Node >= 20 (global fetch + global WebSocket).
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8787";
const WS_BASE = BASE.replace(/^http/, "ws");

/* ----------------------------- tiny harness ----------------------------- */

let failures = 0;
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name, cond, detail) {
  record(name, Boolean(cond), detail);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------- http helpers ----------------------------- */

async function createSession(overrides = {}) {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(overrides),
  });
  return { status: res.status, body: await res.json() };
}

async function join(id, body) {
  const res = await fetch(`${BASE}/sessions/${id}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function status(id) {
  const res = await fetch(`${BASE}/sessions/${id}`);
  return { status: res.status, body: await res.json() };
}

/* ----------------------------- ws helper -------------------------------- */

class WsClient {
  constructor(id, token, label) {
    this.label = label;
    this.msgs = [];
    this.waiters = [];
    this.closed = false;
    this.ws = new WebSocket(
      `${WS_BASE}/sessions/${id}/ws?participantToken=${encodeURIComponent(token)}`,
    );
    this.ws.addEventListener("message", (ev) => {
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.msgs.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (w.pred(m)) {
          w.resolve(m);
          return false;
        }
        return true;
      });
    });
    this.ws.addEventListener("close", () => {
      this.closed = true;
    });
  }

  open(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      const t = setTimeout(() => reject(new Error(`${this.label}: open timeout`)), timeout);
      this.ws.addEventListener("open", () => {
        clearTimeout(t);
        resolve();
      });
      this.ws.addEventListener("error", () => {
        clearTimeout(t);
        reject(new Error(`${this.label}: ws error`));
      });
    });
  }

  waitFor(pred, timeout = 5000) {
    const existing = this.msgs.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${this.label}: timeout waiting for message`)),
        timeout,
      );
      this.waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(t);
          resolve(m);
        },
      });
    });
  }

  waitType(type, timeout = 5000) {
    return this.waitFor((m) => m.type === type, timeout);
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

/* ----------------------------- criteria --------------------------------- */

async function crit1() {
  console.log("\n(1) create -> join -> 2 WS -> gps relayed as peerGps");
  const c = await createSession();
  const id = c.body.sessionId;
  const initiatorToken = c.body.participantToken;
  const j = await join(id, { joinCapability: undefined });
  // join needs the real capability — fetch it from create's joinUrl.
  const cap = new URL(c.body.joinUrl).searchParams.get("cap");
  const j2 = await join(id, { joinCapability: cap });
  assert("join succeeds with valid capability", j2.status === 200, `status ${j2.status}`);
  const joinerToken = j2.body.participantToken;

  const initiator = new WsClient(id, initiatorToken, "initiator");
  const joiner = new WsClient(id, joinerToken, "joiner");
  await initiator.open();
  await joiner.open();

  const initSession = await initiator.waitType("session");
  const joinSession = await joiner.waitType("session");
  assert("initiator gets first 'session' message", initSession.type === "session");
  assert("joiner gets first 'session' message", joinSession.type === "session");

  initiator.send({ type: "gps", lat: 45.5019, lng: -73.5674, accuracy: 8 });
  const peerGps = await joiner.waitType("peerGps");
  assert(
    "joiner receives peerGps with relayed coords",
    peerGps.type === "peerGps" &&
      peerGps.lat === 45.5019 &&
      peerGps.lng === -73.5674 &&
      peerGps.accuracy === 8 &&
      typeof peerGps.at === "number",
    `got lat=${peerGps.lat} lng=${peerGps.lng} acc=${peerGps.accuracy}`,
  );

  initiator.close();
  joiner.close();
  void j; // unused first probe kept for readability
}

async function crit2() {
  console.log("\n(2) join with wrong capability -> rejected");
  const c = await createSession();
  const id = c.body.sessionId;
  const r = await join(id, { joinCapability: "totally-wrong-capability" });
  assert(
    "wrong capability rejected with 4xx",
    r.status >= 400 && r.status < 500,
    `status ${r.status}, error=${r.body.error}`,
  );
}

async function crit3() {
  console.log("\n(3) third join -> rejected (session full)");
  const c = await createSession();
  const id = c.body.sessionId;
  const cap = new URL(c.body.joinUrl).searchParams.get("cap");
  const first = await join(id, { joinCapability: cap });
  assert("first join (2nd participant) accepted", first.status === 200, `status ${first.status}`);
  const third = await join(id, { joinCapability: cap });
  assert(
    "third participant rejected as full",
    third.status === 409 && third.body.error === "session_full",
    `status ${third.status}, error=${third.body.error}`,
  );
}

async function crit4() {
  console.log("\n(4) joinTtl alarm -> session expires");
  const c = await createSession({ joinTtlMs: 1500, maxLifetimeMs: 3_600_000 });
  const id = c.body.sessionId;
  const before = await status(id);
  assert("freshly created session is 'created'", before.body.state === "created", before.body.state);
  await sleep(3500); // let the joinTtl alarm fire
  const after = await status(id);
  assert(
    "session is 'expired' after joinTtl alarm",
    after.body.state === "expired",
    `state=${after.body.state}`,
  );
}

async function crit5() {
  console.log("\n(5) leave -> peer gets peerLeft, state abandoned");
  const c = await createSession();
  const id = c.body.sessionId;
  const cap = new URL(c.body.joinUrl).searchParams.get("cap");
  const j = await join(id, { joinCapability: cap });

  const initiator = new WsClient(id, c.body.participantToken, "initiator");
  const joiner = new WsClient(id, j.body.participantToken, "joiner");
  await initiator.open();
  await joiner.open();
  await initiator.waitType("session");
  await joiner.waitType("session");

  joiner.send({ type: "leave" });
  const peerLeft = await initiator.waitType("peerLeft");
  assert("initiator receives peerLeft", peerLeft.type === "peerLeft");

  await sleep(200);
  const st = await status(id);
  assert("state is 'abandoned' after leave", st.body.state === "abandoned", `state=${st.body.state}`);

  initiator.close();
  joiner.close();
}

async function crit6() {
  console.log("\n(6) WS drop + reconnect with same participantToken -> state preserved");
  const c = await createSession();
  const id = c.body.sessionId;
  const cap = new URL(c.body.joinUrl).searchParams.get("cap");
  const j = await join(id, { joinCapability: cap });
  const joinerToken = j.body.participantToken;

  const initiator = new WsClient(id, c.body.participantToken, "initiator");
  const joiner1 = new WsClient(id, joinerToken, "joiner#1");
  await initiator.open();
  await joiner1.open();
  await initiator.waitType("session");
  await joiner1.waitType("session");

  // Advance the state so we can prove it survives a reconnect.
  joiner1.send({ type: "tier", tier: "very_close" });
  const stateMsg = await initiator.waitType("state");
  assert("state advanced to active_ble via tier", stateMsg.state === "active_ble", stateMsg.state);

  // Drop the joiner socket, then reconnect with the SAME token.
  joiner1.close();
  await sleep(300);
  const joiner2 = new WsClient(id, joinerToken, "joiner#2");
  await joiner2.open();
  const resumed = await joiner2.waitType("session");
  assert(
    "reconnect resumes with preserved state (active_ble)",
    resumed.type === "session" && resumed.state === "active_ble",
    `state=${resumed.state}`,
  );
  assert("reconnect re-delivers bleUuid over WS", typeof resumed.bleUuid === "string" && resumed.bleUuid.length > 0);

  initiator.close();
  joiner2.close();
}

async function crit7() {
  console.log("\n(7) bleUuid only ever appears in the first WS message");
  const c = await createSession();
  const id = c.body.sessionId;
  const cap = new URL(c.body.joinUrl).searchParams.get("cap");
  const j = await join(id, { joinCapability: cap });

  const initiator = new WsClient(id, c.body.participantToken, "initiator");
  await initiator.open();
  const sess = await initiator.waitType("session");
  const bleUuid = sess.bleUuid;

  assert(
    "bleUuid is a 128-bit UUID string",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(bleUuid ?? ""),
    bleUuid,
  );
  assert("bleUuid NOT in joinUrl", !c.body.joinUrl.includes(bleUuid), c.body.joinUrl);
  assert(
    "bleUuid NOT in /sessions (create) response",
    !JSON.stringify(c.body).includes(bleUuid),
    JSON.stringify(c.body),
  );
  assert(
    "bleUuid NOT in /join response",
    !JSON.stringify(j.body).includes(bleUuid),
    JSON.stringify(j.body),
  );
  const st = await status(id);
  assert("bleUuid NOT in public /sessions/:id status", !JSON.stringify(st.body).includes(bleUuid));

  initiator.close();
}

/* ------------------------------- main ----------------------------------- */

async function main() {
  console.log(`Testing Session DO at ${BASE}`);
  // wait for server liveness
  for (let i = 0; i < 30; i++) {
    try {
      const h = await fetch(`${BASE}/health`);
      if (h.ok) break;
    } catch {
      // not up yet
    }
    await sleep(500);
  }

  await crit1();
  await crit2();
  await crit3();
  await crit4();
  await crit5();
  await crit6();
  await crit7();

  console.log("\n=================== SUMMARY ===================");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  }
  const total = results.length;
  console.log(`\n${total - failures}/${total} assertions passed.`);
  if (failures > 0) {
    console.log(`RESULT: FAIL (${failures} failing assertions)`);
    process.exit(1);
  }
  console.log("RESULT: PASS — all 7 criteria proven.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
