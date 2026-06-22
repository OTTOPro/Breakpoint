/**
 * @breakpoint/protocol
 *
 * Single source of truth for BreakPoint's shared types and wire messages.
 *
 * NOTE (step 2.0): these are *initial placeholders*. The real state machine,
 * message payloads and validation rules land in step 2.1 (Session DO) and
 * later steps. Keep this aligned with docs/plan.md as the protocol firms up.
 */
import { z } from "zod";

export * from "./session";
export * from "./messages";
export * from "./ble";

/** Library version marker — handy for debugging wire mismatches later. */
export const PROTOCOL_VERSION = "0.0.0" as const;

/** Re-export zod so consumers can build on the exact same instance. */
export { z };
