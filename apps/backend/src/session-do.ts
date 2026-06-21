import { formatBleUuid, type Tier } from "@breakpoint/protocol";
import {
  ACTIVE_STATES,
  TERMINAL_STATES,
  type ClientWsMessage,
  type GpsFix,
  type Participant,
  type ParticipantRole,
  type ServerWsMessage,
  type SessionRecord,
  type SessionState,
  type WsAttachment,
} from "./types.js";

const STORAGE_KEY = "session";

const DEFAULT_JOIN_TTL_MS = 5 * 60_000; // 5 min
const DEFAULT_MAX_LIFETIME_MS = 60 * 60_000; // 60 min
const DEFAULT_GRACE_MS = 90_000; // 90 s

/** Unambiguous join-code alphabet (no O/0, I/1). */
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Tier ordering for "most advanced wins". */
const TIER_RANK: Record<Tier, number> = {
  far: 0,
  close: 1,
  very_close: 2,
  social: 3,
};

interface CreateBody {
  sessionId: string;
  origin?: string;
  joinTtlMs?: number;
  maxLifetimeMs?: number;
  graceMs?: number;
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomJoinCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += JOIN_CODE_ALPHABET[bytes[i]! % JOIN_CODE_ALPHABET.length];
  }
  return out;
}

/** bleUuid = first 16 bytes of SHA-256(sessionToken), formatted as a UUID. */
async function deriveBleUuid(sessionToken: string): Promise<string> {
  const data = new TextEncoder().encode(sessionToken);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return formatBleUuid(digest.slice(0, 16));
}

function tierToState(tier: Tier): SessionState {
  switch (tier) {
    case "very_close":
      return "active_ble";
    case "social":
      return "social_handoff";
    default:
      return "active_gps";
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class SessionDO {
  private readonly state: DurableObjectState;
  private session?: SessionRecord;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    // Preload the record so hibernation wake-ups have it in memory.
    this.state.blockConcurrencyWhile(async () => {
      this.session = await this.state.storage.get<SessionRecord>(STORAGE_KEY);
    });
  }

  /* --------------------------------------------------------------- */
  /* storage helpers                                                  */
  /* --------------------------------------------------------------- */

  private async load(): Promise<SessionRecord | undefined> {
    if (!this.session) {
      this.session = await this.state.storage.get<SessionRecord>(STORAGE_KEY);
    }
    return this.session;
  }

  private async save(session: SessionRecord): Promise<void> {
    this.session = session;
    await this.state.storage.put(STORAGE_KEY, session);
  }

  /* --------------------------------------------------------------- */
  /* HTTP routing (invoked by the Worker via stub.fetch)             */
  /* --------------------------------------------------------------- */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/create":
        return this.handleCreate(request);
      case "/join":
        return this.handleJoin(request);
      case "/ws":
        return this.handleWs(request);
      case "/status":
        return this.handleStatus();
      case "/cancel":
        return this.handleCancel();
      default:
        return jsonResponse({ error: "not_found" }, 404);
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    const body = (await request.json()) as CreateBody;
    const now = Date.now();

    const sessionToken = toHex(randomBytes(32));
    const bleUuid = await deriveBleUuid(sessionToken);
    const joinTtlMs = body.joinTtlMs ?? DEFAULT_JOIN_TTL_MS;
    const maxLifetimeMs = body.maxLifetimeMs ?? DEFAULT_MAX_LIFETIME_MS;
    const graceMs = body.graceMs ?? DEFAULT_GRACE_MS;

    const session: SessionRecord = {
      sessionId: body.sessionId,
      sessionToken,
      bleUuid,
      joinCode: randomJoinCode(),
      joinCapability: toBase64Url(randomBytes(32)),
      state: "created",
      createdAt: now,
      joinTtlAt: now + joinTtlMs,
      maxLifetimeAt: now + maxLifetimeMs,
      graceDeadlineAt: 0,
      graceMs,
      initiator: {
        role: "initiator",
        participantToken: toHex(randomBytes(32)),
        connected: false,
      },
    };

    await this.save(session);
    await this.armAlarm();

    const origin = body.origin ?? "https://breakpoint.app";
    // joinUrl carries sessionId + joinCapability ONLY. Never the bleUuid.
    const joinUrl = `${origin}/j?sid=${encodeURIComponent(
      session.sessionId,
    )}&cap=${encodeURIComponent(session.joinCapability)}`;

    return jsonResponse({
      sessionId: session.sessionId,
      joinCode: session.joinCode,
      joinUrl,
      participantToken: session.initiator.participantToken,
    });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const session = await this.load();
    if (!session) return jsonResponse({ error: "not_found" }, 404);

    // Already past `created` => either full or no longer joinable.
    if (session.state !== "created") {
      if (session.joiner) return jsonResponse({ error: "session_full" }, 409);
      return jsonResponse({ error: "session_not_joinable" }, 409);
    }

    const now = Date.now();
    if (now >= session.joinTtlAt) {
      await this.expire("join_ttl");
      return jsonResponse({ error: "session_expired" }, 410);
    }

    const body = (await request.json().catch(() => ({}))) as {
      joinCapability?: string;
      joinCode?: string;
    };

    const capOk =
      typeof body.joinCapability === "string" &&
      body.joinCapability === session.joinCapability;
    const codeOk =
      typeof body.joinCode === "string" &&
      body.joinCode.toUpperCase() === session.joinCode;

    if (!capOk && !codeOk) {
      return jsonResponse({ error: "invalid_capability" }, 403);
    }

    session.joiner = {
      role: "joiner",
      participantToken: toHex(randomBytes(32)),
      connected: false,
    };
    session.state = "active_gps";
    await this.save(session);
    await this.armAlarm();

    return jsonResponse({
      sessionId: session.sessionId,
      participantToken: session.joiner.participantToken,
    });
  }

  private async handleStatus(): Promise<Response> {
    const session = await this.load();
    if (!session) return jsonResponse({ error: "not_found" }, 404);
    // Public projection — NO secrets, NO bleUuid.
    return jsonResponse({
      sessionId: session.sessionId,
      state: session.state,
      joinCode: session.joinCode,
      initiatorConnected: session.initiator.connected,
      joinerPresent: Boolean(session.joiner),
      joinerConnected: session.joiner?.connected ?? false,
    });
  }

  private async handleCancel(): Promise<Response> {
    const session = await this.load();
    if (!session) return jsonResponse({ error: "not_found" }, 404);
    if (session.state === "created") {
      session.state = "cancelled";
      await this.save(session);
      this.broadcast({ type: "ended", reason: "cancelled" });
      this.closeAll();
    }
    return jsonResponse({ state: session.state });
  }

  private async handleWs(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return jsonResponse({ error: "expected_websocket" }, 426);
    }
    const session = await this.load();
    if (!session) return jsonResponse({ error: "not_found" }, 404);
    if (TERMINAL_STATES.has(session.state)) {
      return jsonResponse({ error: "session_closed" }, 403);
    }

    const url = new URL(request.url);
    const token =
      url.searchParams.get("participantToken") ??
      request.headers.get("X-Participant-Token") ??
      "";

    const role = this.roleForToken(session, token);
    if (!role) return jsonResponse({ error: "invalid_token" }, 403);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    // One live socket per role: drop any previous one (clean reconnection).
    for (const old of this.state.getWebSockets(role)) {
      try {
        old.close(1012, "reconnected");
      } catch {
        // ignore
      }
    }

    this.state.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role } satisfies WsAttachment);

    const participant = this.participant(session, role);
    participant.connected = true;
    session.graceDeadlineAt = 0; // someone is connected again
    await this.save(session);
    await this.armAlarm();

    const peer = this.peer(session, role);
    const peerPresent = Boolean(peer && peer.connected);

    this.sendTo(server, {
      type: "session",
      bleUuid: session.bleUuid,
      peerPresent,
      state: session.state,
    });

    // Tell the already-connected peer that this side is now here.
    this.sendToRole(this.otherRole(role), { type: "peerJoined" });

    return new Response(null, { status: 101, webSocket: client });
  }

  /* --------------------------------------------------------------- */
  /* WebSocket hibernation handlers                                   */
  /* --------------------------------------------------------------- */

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const session = await this.load();
    if (!session) return;
    const attachment = ws.deserializeAttachment() as WsAttachment | null;
    if (!attachment) return;
    const role = attachment.role;

    let msg: ClientWsMessage;
    try {
      msg = JSON.parse(typeof message === "string" ? message : "") as ClientWsMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "gps":
        await this.onGps(session, role, msg);
        break;
      case "tier":
        await this.onTier(session, role, msg.tier);
        break;
      case "leave":
        await this.onLeave(session, role);
        break;
      case "met":
        await this.onMet(session);
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const session = await this.load();
    if (!session) return;
    const attachment = ws.deserializeAttachment() as WsAttachment | null;
    if (!attachment) return;

    const participant = this.participant(session, attachment.role);
    participant.connected = false;

    // If both are gone during an active phase, start the grace countdown.
    if (ACTIVE_STATES.has(session.state) && !this.anyConnected(session)) {
      session.graceDeadlineAt = Date.now() + session.graceMs;
    }
    await this.save(session);
    await this.armAlarm();
  }

  /* --------------------------------------------------------------- */
  /* message handlers                                                 */
  /* --------------------------------------------------------------- */

  private async onGps(
    session: SessionRecord,
    role: ParticipantRole,
    msg: Extract<ClientWsMessage, { type: "gps" }>,
  ): Promise<void> {
    if (!ACTIVE_STATES.has(session.state)) return;
    const fix: GpsFix = {
      lat: msg.lat,
      lng: msg.lng,
      accuracy: msg.accuracy,
      bearing: msg.bearing,
      at: Date.now(),
    };
    this.participant(session, role).lastGps = fix;
    await this.save(session);

    this.sendToRole(this.otherRole(role), {
      type: "peerGps",
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      bearing: fix.bearing,
      at: fix.at,
    });
  }

  private async onTier(
    session: SessionRecord,
    role: ParticipantRole,
    tier: Tier,
  ): Promise<void> {
    if (!ACTIVE_STATES.has(session.state)) return;
    this.participant(session, role).tier = tier;

    // State follows the MOST advanced tier across both phones.
    const ranks = [session.initiator.tier, session.joiner?.tier]
      .filter((t): t is Tier => Boolean(t))
      .map((t) => TIER_RANK[t]);
    const topRank = Math.max(0, ...ranks);
    const topTier = (Object.keys(TIER_RANK) as Tier[]).find(
      (t) => TIER_RANK[t] === topRank,
    )!;
    const nextState = tierToState(topTier);

    const stateChanged = nextState !== session.state;
    if (stateChanged) session.state = nextState;
    await this.save(session);

    this.sendToRole(this.otherRole(role), { type: "peerTier", tier });
    if (stateChanged) {
      this.broadcast({ type: "state", state: session.state });
    }
  }

  private async onLeave(
    session: SessionRecord,
    role: ParticipantRole,
  ): Promise<void> {
    if (TERMINAL_STATES.has(session.state)) return;
    session.state = "abandoned";
    session.graceDeadlineAt = 0;
    await this.save(session);

    this.sendToRole(this.otherRole(role), { type: "peerLeft" });
    this.broadcast({ type: "state", state: "abandoned" });
    this.sendToRole(this.otherRole(role), {
      type: "ended",
      reason: "abandoned",
    });
    this.closeAll();
  }

  private async onMet(session: SessionRecord): Promise<void> {
    if (TERMINAL_STATES.has(session.state)) return;
    session.state = "ended";
    session.graceDeadlineAt = 0;
    await this.save(session);
    this.broadcast({ type: "ended", reason: "met" });
    this.broadcast({ type: "state", state: "ended" });
    this.closeAll();
  }

  /* --------------------------------------------------------------- */
  /* alarms / TTL                                                     */
  /* --------------------------------------------------------------- */

  async alarm(): Promise<void> {
    const session = await this.load();
    if (!session) return;
    if (TERMINAL_STATES.has(session.state)) return;
    const now = Date.now();

    if (session.state === "created" && now >= session.joinTtlAt) {
      await this.expire("join_ttl");
      return;
    }
    if (now >= session.maxLifetimeAt) {
      await this.expire("max_lifetime");
      return;
    }
    if (
      session.graceDeadlineAt &&
      now >= session.graceDeadlineAt &&
      ACTIVE_STATES.has(session.state) &&
      !this.anyConnected(session)
    ) {
      session.state = "abandoned";
      session.graceDeadlineAt = 0;
      await this.save(session);
      this.closeAll();
      return;
    }

    // Nothing due yet — re-arm for the next deadline.
    await this.armAlarm();
  }

  private async expire(reason: string): Promise<void> {
    const session = this.session;
    if (!session) return;
    session.state = "expired";
    session.graceDeadlineAt = 0;
    await this.save(session);
    this.broadcast({ type: "ended", reason });
    this.closeAll();
  }

  /** Set the DO alarm to the earliest still-relevant deadline. */
  private async armAlarm(): Promise<void> {
    const session = this.session;
    if (!session || TERMINAL_STATES.has(session.state)) {
      await this.state.storage.deleteAlarm();
      return;
    }
    const candidates: number[] = [session.maxLifetimeAt];
    if (session.state === "created") candidates.push(session.joinTtlAt);
    if (session.graceDeadlineAt) candidates.push(session.graceDeadlineAt);
    const next = Math.min(...candidates);
    await this.state.storage.setAlarm(next);
  }

  /* --------------------------------------------------------------- */
  /* participant / socket helpers                                     */
  /* --------------------------------------------------------------- */

  private roleForToken(
    session: SessionRecord,
    token: string,
  ): ParticipantRole | null {
    if (token && token === session.initiator.participantToken) {
      return "initiator";
    }
    if (token && session.joiner && token === session.joiner.participantToken) {
      return "joiner";
    }
    return null;
  }

  private participant(
    session: SessionRecord,
    role: ParticipantRole,
  ): Participant {
    if (role === "initiator") return session.initiator;
    if (!session.joiner) {
      // Should not happen: a joiner socket implies a joiner record.
      throw new Error("joiner missing");
    }
    return session.joiner;
  }

  private peer(
    session: SessionRecord,
    role: ParticipantRole,
  ): Participant | undefined {
    return role === "initiator" ? session.joiner : session.initiator;
  }

  private otherRole(role: ParticipantRole): ParticipantRole {
    return role === "initiator" ? "joiner" : "initiator";
  }

  private anyConnected(session: SessionRecord): boolean {
    return (
      session.initiator.connected || Boolean(session.joiner?.connected)
    );
  }

  private sendTo(ws: WebSocket, msg: ServerWsMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket gone; ignore
    }
  }

  private sendToRole(role: ParticipantRole, msg: ServerWsMessage): void {
    for (const ws of this.state.getWebSockets(role)) {
      this.sendTo(ws, msg);
    }
  }

  private broadcast(msg: ServerWsMessage): void {
    for (const ws of this.state.getWebSockets()) {
      this.sendTo(ws, msg);
    }
  }

  private closeAll(): void {
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.close(1000, "session_closed");
      } catch {
        // ignore
      }
    }
  }
}
