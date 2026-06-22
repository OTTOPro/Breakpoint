import { z } from "zod";
import { sessionStateSchema, tierSchema } from "./session";

/**
 * WebSocket wire protocol between a phone and the Session Durable Object.
 * This is the authoritative shape spoken by the backend (step 2.1) and the
 * mobile WS client (step 2.3).
 */

/** A geo fix relayed over the control plane. */
export const gpsFixSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nonnegative(),
  bearing: z.number().optional(),
  /** epoch millis (added by the server when relaying). */
  at: z.number().int().nonnegative().optional(),
});
export type GpsFix = z.infer<typeof gpsFixSchema>;

/* ------------------------------------------------------------------ */
/* client -> server                                                    */
/* ------------------------------------------------------------------ */

export const clientGpsSchema = z.object({
  type: z.literal("gps"),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nonnegative(),
  bearing: z.number().optional(),
});

export const clientTierSchema = z.object({
  type: z.literal("tier"),
  tier: tierSchema,
});

export const clientLeaveSchema = z.object({ type: z.literal("leave") });
export const clientMetSchema = z.object({ type: z.literal("met") });

export const clientMessageSchema = z.discriminatedUnion("type", [
  clientGpsSchema,
  clientTierSchema,
  clientLeaveSchema,
  clientMetSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/* ------------------------------------------------------------------ */
/* server -> client                                                    */
/* ------------------------------------------------------------------ */

export const serverSessionSchema = z.object({
  type: z.literal("session"),
  /** UUID derived from the session token, delivered ONLY here over WS. */
  bleUuid: z.string(),
  peerPresent: z.boolean(),
  state: sessionStateSchema,
});

export const serverPeerJoinedSchema = z.object({
  type: z.literal("peerJoined"),
});

export const serverPeerGpsSchema = z.object({
  type: z.literal("peerGps"),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nonnegative(),
  bearing: z.number().optional(),
  at: z.number(),
});

export const serverPeerTierSchema = z.object({
  type: z.literal("peerTier"),
  tier: tierSchema,
});

export const serverStateSchema = z.object({
  type: z.literal("state"),
  state: sessionStateSchema,
});

export const serverPeerLeftSchema = z.object({ type: z.literal("peerLeft") });

export const serverEndedSchema = z.object({
  type: z.literal("ended"),
  reason: z.string(),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  serverSessionSchema,
  serverPeerJoinedSchema,
  serverPeerGpsSchema,
  serverPeerTierSchema,
  serverStateSchema,
  serverPeerLeftSchema,
  serverEndedSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Parse an untrusted server frame; returns null if it doesn't match. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  const result = serverMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}
