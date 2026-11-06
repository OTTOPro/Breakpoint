/** Timing limits for a session. No imports, so it can be tested on its own. */

/** Timings used when the client asks for nothing. */
export const DEFAULT_JOIN_TTL_MS = 5 * 60_000; // 5 min
export const DEFAULT_MAX_LIFETIME_MS = 60 * 60_000; // 60 min
export const DEFAULT_GRACE_MS = 90_000; // 90 s

/**
 * Upper bounds for the timings a client may request at creation. A request
 * can shorten a session (tests do) but never make it outlive these.
 */
export const MAX_JOIN_TTL_MS = 10 * 60_000; // 10 min
export const MAX_LIFETIME_MS = 2 * 60 * 60_000; // 2 h
export const MAX_GRACE_MS = 5 * 60_000; // 5 min
/** Below this a session could not even be joined. */
export const MIN_TIMING_MS = 1_000;

/** A requested duration, or the default, kept within [MIN_TIMING_MS, max]. */
export function boundedMs(requested: unknown, fallback: number, max: number): number {
  if (typeof requested !== "number" || !Number.isFinite(requested)) return fallback;
  return Math.min(Math.max(requested, MIN_TIMING_MS), max);
}
