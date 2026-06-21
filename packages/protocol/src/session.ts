import { z } from "zod";

/**
 * Lifecycle of a meetup session, as seen by the backend Durable Object.
 * (Placeholder union — the real transitions are wired in step 2.1.)
 */
export const SessionState = {
  Created: "created",
  Waiting: "waiting",
  Active: "active",
  Ended: "ended",
} as const;

export type SessionState = (typeof SessionState)[keyof typeof SessionState];

export const sessionStateSchema = z.enum([
  "created",
  "waiting",
  "active",
  "ended",
]);

/**
 * Proximity tier. Drives the UI colour/guidance. Computed on-device from
 * sensors (GPS → BLE → social) — never by the server.
 */
export type Tier = "far" | "close" | "very_close" | "social";

export const tierSchema = z.enum(["far", "close", "very_close", "social"]);

/** Max participants in V1. */
export const MAX_PARTICIPANTS = 2 as const;
