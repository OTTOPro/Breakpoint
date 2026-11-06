import { describe, it, expect } from 'vitest';

import { ProximityPipeline } from './proximityPipeline';

/** Feed `count` strong samples ending at `end`, 200 ms apart. */
function feedStrong(p: ProximityPipeline, end: number, count = 6): void {
  for (let i = count - 1; i >= 0; i--) {
    p.push({ rssi: -60, at: end - i * 200 });
  }
}

describe('ProximityPipeline: silence ages the signal', () => {
  it('locks on a steady signal', () => {
    const p = new ProximityPipeline();
    feedStrong(p, 10_000);
    expect(p.tier).toBe('very_close');
  });

  it('keeps the lock through a short drop (grace period)', () => {
    const p = new ProximityPipeline();
    feedStrong(p, 10_000);
    const snap = p.tick(12_000);
    expect(snap.locked).toBe(true);
    expect(p.tier).not.toBe('far');
  });

  it('empties the window once the samples are older than it', () => {
    const p = new ProximityPipeline();
    feedStrong(p, 10_000);
    const snap = p.tick(14_500);
    expect(snap.samples).toHaveLength(0);
    // No fresh signal: the zone is no longer the last strong reading.
    expect(snap.zone).toBe('far');
  });

  it('drops back to GPS guidance after the grace period with no new sample', () => {
    const tiers: string[] = [];
    const p = new ProximityPipeline({ onTierChange: (t) => tiers.push(t) });
    feedStrong(p, 10_000);
    const snap = p.tick(15_000);
    expect(snap.locked).toBe(false);
    expect(p.tier).toBe('far');
    expect(tiers[tiers.length - 1]).toBe('far');
  });
});

describe('ProximityPipeline: unusable RSSI values are ignored', () => {
  it('does not treat the iOS "unavailable" value 127 as a strong signal', () => {
    const p = new ProximityPipeline();
    for (let i = 0; i < 6; i++) p.push({ rssi: 127, at: 10_000 + i * 200 });
    expect(p.tier).toBe('far');
  });

  it('keeps the real samples around an unusable one', () => {
    const p = new ProximityPipeline();
    feedStrong(p, 10_000);
    const snap = p.push({ rssi: 127, at: 10_100 });
    expect(snap.samples.every((s) => s.rssi === -60)).toBe(true);
    expect(snap.zone).toBe('very_close');
  });
});
