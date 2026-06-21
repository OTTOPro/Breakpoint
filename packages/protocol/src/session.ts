import { z } from "zod";

/**
 * Lifecycle of a meetup session, as owned by the backend Durable Object.
 * Mirrors the authoritative state machine implemented in step 2.1.
 */
export const sessionStateSchema = z.enum([
  "created",
  "active_gps",
  "active_ble",
  "social_handoff",
  "ended",
  "expired",
  "cancelled",
  "abandoned",
]);

export type SessionState = z.infer<typeof sessionStateSchema>;

/** Convenience constants for the session states. */
export const SessionState = {
  Created: "created",
  ActiveGps: "active_gps",
  ActiveBle: "active_ble",
  SocialHandoff: "social_handoff",
  Ended: "ended",
  Expired: "expired",
  Cancelled: "cancelled",
  Abandoned: "abandoned",
} as const satisfies Record<string, SessionState>;

/**
 * Proximity tier. Drives the UI colour/guidance. Computed on-device from
 * sensors (GPS → BLE → social) — never by the server.
 */
export type Tier = "far" | "close" | "very_close" | "social";

export const tierSchema = z.enum(["far", "close", "very_close", "social"]);

/** Tier ordering, widest (far=0) to tightest (social=3). */
export const TIER_ORDER: readonly Tier[] = [
  "far",
  "close",
  "very_close",
  "social",
];

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Max participants in V1. */
export const MAX_PARTICIPANTS = 2 as const;
