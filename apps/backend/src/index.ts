import { Hono } from "hono";
import { SessionDO } from "./session-do.js";

export { SessionDO };

const app = new Hono<{ Bindings: Env }>();

/** Resolve the DO stub that owns a given session id. */
function stubFor(env: Env, sessionId: string) {
  return env.SESSION_DO.get(env.SESSION_DO.idFromName(sessionId));
}

/** Liveness probe. */
app.get("/health", (c) => c.json({ ok: true }));

/**
 * Create a session.
 * Body may carry test overrides: { joinTtlMs?, maxLifetimeMs?, graceMs? }.
 * Returns { sessionId, joinCode, joinUrl, participantToken } — never the bleUuid.
 */
app.post("/sessions", async (c) => {
  const sessionId = crypto.randomUUID();
  const origin = new URL(c.req.url).origin;
  const overrides = await c.req.json().catch(() => ({}));

  const stub = stubFor(c.env, sessionId);
  const res = await stub.fetch("https://do/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...overrides, sessionId, origin }),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

/**
 * Join a session. Body: { joinCapability } or { joinCode }.
 * Returns { sessionId, participantToken } — never the bleUuid.
 */
app.post("/sessions/:id/join", async (c) => {
  const sessionId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const stub = stubFor(c.env, sessionId);
  const res = await stub.fetch("https://do/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

/** Public session status (no secrets, no bleUuid) — handy for tests/clients. */
app.get("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const stub = stubFor(c.env, sessionId);
  const res = await stub.fetch("https://do/status");
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

/** Initiator cancels a not-yet-joined session. */
app.post("/sessions/:id/cancel", async (c) => {
  const sessionId = c.req.param("id");
  const stub = stubFor(c.env, sessionId);
  const res = await stub.fetch("https://do/cancel", { method: "POST" });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

/**
 * WebSocket upgrade for a participant.
 * Query/header carries the participantToken. Forwarded to the DO, which
 * accepts the socket (hibernation API) and delivers the bleUuid as the first
 * message.
 */
app.get("/sessions/:id/ws", async (c) => {
  const sessionId = c.req.param("id");
  if (c.req.header("Upgrade") !== "websocket") {
    return c.json({ error: "expected_websocket" }, 426);
  }
  const token =
    new URL(c.req.url).searchParams.get("participantToken") ??
    c.req.header("X-Participant-Token") ??
    "";

  const stub = stubFor(c.env, sessionId);
  const doUrl = `https://do/ws?participantToken=${encodeURIComponent(token)}`;
  return stub.fetch(new Request(doUrl, c.req.raw));
});

export default app;
