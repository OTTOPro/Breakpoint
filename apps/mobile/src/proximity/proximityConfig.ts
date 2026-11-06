import type { Tier } from '@breakpoint/protocol';
import { create } from 'zustand';

import { DEFAULT_ZONE_THRESHOLDS, type ZoneThresholds } from './smoothing';

/**
 * Runtime-tunable proximity config: a single store the diagnostics screen can
 * tweak live. The pipeline reads this; there is no parallel logic.
 */
export interface ProximityConfig {
  // smoothing
  alpha: number;
  windowMs: number;
  /** Trend window in ms, and the slope (dB/s) needed to call a direction. */
  trendWindowMs: number;
  trendEps: number;
  // lock gating + hysteresis
  lockSamples: number;
  lockWindowMs: number;
  graceMs: number;
  minBleTier: Tier;
  // zone thresholds (dBm)
  zoneThresholds: ZoneThresholds;
}

export const DEFAULT_PROXIMITY_CONFIG: ProximityConfig = {
  alpha: 0.25,
  // The window holds a little more than the trend needs.
  windowMs: 4_000,
  trendWindowMs: 3_000,
  trendEps: 1,
  lockSamples: 3,
  lockWindowMs: 2_000,
  graceMs: 4_000,
  minBleTier: 'close',
  zoneThresholds: { ...DEFAULT_ZONE_THRESHOLDS },
};

function freshDefaults(): ProximityConfig {
  return {
    ...DEFAULT_PROXIMITY_CONFIG,
    zoneThresholds: { ...DEFAULT_PROXIMITY_CONFIG.zoneThresholds },
  };
}

interface ProximityConfigStore {
  config: ProximityConfig;
  set: (patch: Partial<ProximityConfig>) => void;
  setThreshold: (zone: keyof ZoneThresholds, value: number) => void;
  reset: () => void;
}

export const useProximityConfig = create<ProximityConfigStore>((set) => ({
  config: freshDefaults(),
  set: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setThreshold: (zone, value) =>
    set((s) => ({
      config: {
        ...s.config,
        zoneThresholds: { ...s.config.zoneThresholds, [zone]: value },
      },
    })),
  reset: () => set({ config: freshDefaults() }),
}));

/** Current config snapshot (read by the ProximityPipeline on each push). */
export function getProximityConfig(): ProximityConfig {
  return useProximityConfig.getState().config;
}
