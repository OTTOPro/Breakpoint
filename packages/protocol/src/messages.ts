import { z } from "zod";
import { tierSchema } from "./session.js";

/**
 * WebSocket message placeholders (step 2.0).
 *
 * The control plane relays GPS/tier updates and delivers the derived
 * `bleUuid`. Real payloads are defined in step 2.1 — these stubs only exist
 * so the apps can import and type-check against a shared shape today.
 */

/** Coarse geo position relayed over the control plane. */
export const geoPositionSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  accuracy: z.number().nonnegative().optional(),
  ts: z.number().int().nonnegative(),
});
export type GeoPosition = z.infer<typeof geoPositionSchema>;

/* ------------------------------------------------------------------ */
/* client -> server                                                    */
/* ------------------------------------------------------------------ */

export const clientHelloSchema = z.object({
  type: z.literal("hello"),
  sessionToken: z.string().min(1),
});

export const clientPositionSchema = z.object({
  type: z.literal("position"),
  position: geoPositionSchema,
});

export const clientTierSchema = z.object({
  type: z.literal("tier"),
  tier: tierSchema,
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  clientHelloSchema,
  clientPositionSchema,
  clientTierSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/* ------------------------------------------------------------------ */
/* server -> client                                                    */
/* ------------------------------------------------------------------ */

export const serverWelcomeSchema = z.object({
  type: z.literal("welcome"),
  /** UUID derived from the session token, delivered only over WS. */
  bleUuid: z.string(),
});

export const serverPeerPositionSchema = z.object({
  type: z.literal("peer_position"),
  position: geoPositionSchema,
});

export const serverPeerTierSchema = z.object({
  type: z.literal("peer_tier"),
  tier: tierSchema,
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  serverWelcomeSchema,
  serverPeerPositionSchema,
  serverPeerTierSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
