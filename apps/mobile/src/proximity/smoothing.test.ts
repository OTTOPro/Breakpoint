import { describe, it, expect } from 'vitest';

import {
  computeProximity,
  emaSeries,
  rssiToZone,
  zoneRank,
  type RssiSample,
} from './smoothing';

/** Build samples from a list of rssi values, 200ms apart. */
function samples(rssis: number[]): RssiSample[] {
  return rssis.map((rssi, i) => ({ rssi, at: 1_000 + i * 200 }));
}

describe('rssiToZone', () => {
  it('maps strength bands to zones', () => {
    expect(rssiToZone(-45)).toBe('social');
    expect(rssiToZone(-60)).toBe('very_close');
    expect(rssiToZone(-72)).toBe('close');
    expect(rssiToZone(-95)).toBe('far');
  });
});

describe('computeProximity — rising signal (peer approaching)', () => {
  const rising = samples([-90, -88, -85, -82, -78, -74, -70, -66, -62, -58, -54, -50, -46]);

  it('tightens the zone and reports trend = warming', () => {
    const early = computeProximity(rising.slice(0, 3));
    const now = computeProximity(rising);

    // Zone gets tighter (higher rank) as the signal climbs.
    expect(zoneRank(now.zone)).toBeGreaterThan(zoneRank(early.zone));
    // Smoothed signal is stronger than it was early on.
    expect(now.rssiSmoothed).toBeGreaterThan(early.rssiSmoothed);
    // Trend is warming.
    expect(now.trend).toBe('warming');
  });
});

describe('computeProximity — falling signal (peer leaving)', () => {
  const falling = samples([-46, -50, -54, -58, -62, -66, -70, -74, -78, -82, -85, -88, -90]);

  it('widens the zone and reports trend = cooling', () => {
    const early = computeProximity(falling.slice(0, 3));
    const now = computeProximity(falling);

    // Zone widens (lower rank) as the signal drops.
    expect(zoneRank(now.zone)).toBeLessThan(zoneRank(early.zone));
    expect(now.rssiSmoothed).toBeLessThan(early.rssiSmoothed);
    expect(now.trend).toBe('cooling');
  });
});

describe('computeProximity — single outlier absorbed by smoothing', () => {
  // Steady ~-72 ('close'), with one bogus strong spike to -45 ('social') mid-stream.
  const steady = [-72, -72, -71, -73, -72, -72, -72, -71, -72, -73, -72, -72];
  const withOutlier = [...steady];
  withOutlier[6] = -45; // a single rogue 'social'-strength reading

  it('does not jump zones on one rogue sample', () => {
    const clean = computeProximity(samples(steady));
    const noisy = computeProximity(samples(withOutlier));

    // The raw outlier alone would read 'social'…
    expect(rssiToZone(-45)).toBe('social');

    // …but the smoothed stream stays in the same zone as the clean stream.
    expect(noisy.zone).toBe(clean.zone);
    expect(noisy.zone).toBe('close');

    // And no smoothed step ever spikes up into very_close/social.
    const smoothedZones = emaSeries(withOutlier).map(rssiToZone);
    expect(smoothedZones.every((z) => z === 'close')).toBe(true);
  });
});

describe('computeProximity — edge cases', () => {
  it('returns far/steady with no samples', () => {
    const r = computeProximity([]);
    expect(r.zone).toBe('far');
    expect(r.trend).toBe('steady');
  });

  it('reports steady for a flat signal', () => {
    const flat = computeProximity(samples([-70, -70, -70, -70, -70, -70]));
    expect(flat.trend).toBe('steady');
    expect(flat.zone).toBe('close');
  });
});
