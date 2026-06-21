import { beforeEach, describe, expect, it } from 'vitest';

import { ProximityPipeline } from '../session/proximityPipeline';

import {
  DEFAULT_PROXIMITY_CONFIG,
  useProximityConfig,
} from './proximityConfig';

beforeEach(() => useProximityConfig.getState().reset());

/** Push `n` identical samples through a fresh pipeline; return the last snapshot. */
function snap(rssi: number, n = 8) {
  const pipe = new ProximityPipeline();
  let last = pipe.push({ rssi, at: 1_000_000 });
  for (let i = 1; i < n; i++) last = pipe.push({ rssi, at: 1_000_000 + i * 150 });
  return last;
}

describe('proximityConfig — defaults changed nothing', () => {
  it('matches the historical constants exactly', () => {
    expect(DEFAULT_PROXIMITY_CONFIG).toEqual({
      alpha: 0.25,
      windowMs: 2_000,
      trendLookback: 4,
      trendEps: 1.5,
      lockSamples: 3,
      lockWindowMs: 2_000,
      graceMs: 4_000,
      minBleTier: 'close',
      zoneThresholds: { social: -50, very_close: -65, close: -78 },
    });
  });
});

describe('proximityConfig — propagates to the pipeline output', () => {
  it('a zone-threshold change flips the zone for the SAME signal (computeProximity)', () => {
    const before = snap(-66); // default very_close = -65 → -66 reads as "close"
    expect(before.zone).toBe('close');

    useProximityConfig.getState().setThreshold('very_close', -70);
    const after = snap(-66); // now -66 ≥ -70 → "very_close"
    expect(after.zone).toBe('very_close');
  });

  it('a lockSamples change flips the BLE lock for the SAME signal (orchestrator)', () => {
    // Default lockSamples = 3 → two samples is not a stable lock.
    const pipe = new ProximityPipeline();
    pipe.push({ rssi: -60, at: 1_000 });
    expect(pipe.push({ rssi: -60, at: 1_150 }).locked).toBe(false);

    useProximityConfig.getState().set({ lockSamples: 1 });
    const pipe2 = new ProximityPipeline();
    expect(pipe2.push({ rssi: -60, at: 1_000 }).locked).toBe(true);
  });

  it('reset restores defaults', () => {
    useProximityConfig.getState().set({ alpha: 0.9 });
    useProximityConfig.getState().reset();
    expect(useProximityConfig.getState().config.alpha).toBe(0.25);
  });
});
