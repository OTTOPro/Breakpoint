import type { Tier } from "@breakpoint/protocol";

/**
 * Authoritative control-plane types for the Session Durable Object (step 2.1).
 *
 * The `@breakpoint/protocol` package holds the cross-app placeholders; this
 * file is the backend's source of truth for the session record and the exact
 * WebSocket wire protocol the DO speaks.
 */

export type ParticipantRole = "initiator" | "joiner";

export type SessionState =
  | "created"
  | "active_gps"
  | "active_ble"
  | "social_handoff"
  | "ended"
  | "expired"
  | "cancelled"
  | "abandoned";

/** States in which the session is still "live" and relaying. */
export const ACTIVE_STATES: ReadonlySet<SessionState> = new Set([
  "active_gps",
  "active_ble",
  "social_handoff",
]);

/** Terminal states — nothing more happens. */
export const TERMINAL_STATES: ReadonlySet<SessionState> = new Set([
  "ended",
  "expired",
  "cancelled",
  "abandoned",
]);

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
  bearing?: number;
  at: number;
}

export interface Participant {
  role: ParticipantRole;
  /** Secret used to authenticate this participant's WS connection. */
  participantToken: string;
  connected: boolean;
  lastGps?: GpsFix;
  tier?: Tier;
}

export interface SessionRecord {
  sessionId: string;
  /** Root secret. Never leaves the DO. */
  sessionToken: string;
  /** 128-bit UUID derived from sessionToken; delivered ONLY over WS. */
  bleUuid: string;
  /** 6 human-readable characters (unambiguous alphabet). */
  joinCode: string;
  /** High-entropy secret carried by the share link / QR. */
  joinCapability: string;
  state: SessionState;
  createdAt: number;
  /** Expiry if nobody joins. */
  joinTtlAt: number;
  /** Hard max lifetime. */
  maxLifetimeAt: number;
  /** When both participants are disconnected during an active phase, the
   *  deadline after which the session is abandoned. 0 = not armed. */
  graceDeadlineAt: number;
  /** Grace period length (ms) used to (re)arm graceDeadlineAt. */
  graceMs: number;
  initiator: Participant;
  joiner?: Participant;
}

/* ------------------------------------------------------------------ */
/* WebSocket protocol                                                  */
/* ------------------------------------------------------------------ */

/** client -> server */
export type ClientWsMessage =
  | { type: "gps"; lat: number; lng: number; accuracy: number; bearing?: number }
  | { type: "tier"; tier: Tier }
  | { type: "leave" }
  | { type: "met" };

/** server -> client */
export type ServerWsMessage =
  | { type: "session"; bleUuid: string; peerPresent: boolean; state: SessionState }
  | { type: "peerJoined" }
  | {
      type: "peerGps";
      lat: number;
      lng: number;
      accuracy: number;
      bearing?: number;
      at: number;
    }
  | { type: "peerTier"; tier: Tier }
  | { type: "state"; state: SessionState }
  | { type: "peerLeft" }
  | { type: "ended"; reason: string };

/** Data we keep attached to each hibernatable WebSocket. */
export interface WsAttachment {
  role: ParticipantRole;
}
