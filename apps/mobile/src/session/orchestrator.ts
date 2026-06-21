import type { Tier } from '@breakpoint/protocol';

import type { RssiSample, Zone } from '../proximity/smoothing';

/**
 * Tier orchestrator — the brain. PURE given its internal state.
 *
 * Decides the *displayed* tier from physics:
 *  - BLE scans from the start, in parallel with GPS.
 *  - No stable BLE lock yet  → tier = "far" (GPS guidance).
 *  - Stable BLE lock         → tier follows the smoothed proximity zone
 *    (floored at "close", since any BLE detection means we're near).
 *
 * Hysteresis prevents UI flapping:
 *  - Promotion to BLE needs `lockSamples` samples within `lockWindowMs`.
 *  - Demotion back to GPS only after `graceMs` of silence — a brief drop is
 *    absorbed.
 */
export type OrchestratorConfig = {
  /** Samples within the window required to consider the lock stable. */
  lockSamples: number;
  /** Lock window in ms. */
  lockWindowMs: number;
  /** Grace period of silence before demoting BLE → GPS, in ms. */
  graceMs: number;
  /** Floor tier once locked (any BLE detection ⇒ at least this). */
  minBleTier: Tier;
};

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  lockSamples: 3,
  lockWindowMs: 2_000,
  graceMs: 4_000,
  minBleTier: 'close',
};

export type OrchestratorInput = {
  now: number;
  /** Raw RSSI samples currently in the smoothing window. */
  samples: readonly RssiSample[];
  /** Smoothed proximity zone (from computeProximity). */
  zone: Zone;
  /** GPS distance to peer in meters, if known (used for far-tier guidance). */
  distanceM?: number;
};

export class TierOrchestrator {
  private config: OrchestratorConfig;
  private locked = false;
  private lastSignalAt = 0;
  private currentTier: Tier = 'far';

  constructor(
    config: Partial<OrchestratorConfig> = {},
    private readonly onTierChange?: (tier: Tier) => void,
  ) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
  }

  /** Live-tune the lock/grace config (used by the diagnostics tool). */
  setConfig(patch: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  get tier(): Tier {
    return this.currentTier;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  /** Feed the latest signals; returns the (possibly unchanged) displayed tier. */
  update(input: OrchestratorInput): Tier {
    const { now, samples, zone } = input;
    const { lockSamples, lockWindowMs, graceMs, minBleTier } = this.config;

    if (samples.length > 0) {
      const lastAt = Math.max(...samples.map((s) => s.at));
      if (lastAt > this.lastSignalAt) this.lastSignalAt = lastAt;
    }

    const recentCount = samples.filter(
      (s) => s.at >= now - lockWindowMs,
    ).length;
    const hasFreshLock = recentCount >= lockSamples;

    if (hasFreshLock) {
      this.locked = true;
    } else if (this.locked && now - this.lastSignalAt > graceMs) {
      // Silence beyond the grace period — drop back to GPS guidance.
      this.locked = false;
    }

    const tier: Tier = this.locked
      ? zone === 'far'
        ? minBleTier
        : zone
      : 'far';

    if (tier !== this.currentTier) {
      this.currentTier = tier;
      this.onTierChange?.(tier);
    }
    return tier;
  }

  /** Reset internal state (e.g. on a fresh session). */
  reset(): void {
    this.locked = false;
    this.lastSignalAt = 0;
    this.currentTier = 'far';
  }
}
