import { describe, it, expect } from 'vitest';

import type { Tier } from '@breakpoint/protocol';

import type { RssiSample } from '../proximity/smoothing';

import { TierOrchestrator } from './orchestrator';

/** `count` samples ending at `now`, `stepMs` apart (all within a 2s window). */
function recent(now: number, count: number, stepMs = 200): RssiSample[] {
  const out: RssiSample[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push({ rssi: -60, at: now - i * stepMs });
  }
  return out;
}

describe('TierOrchestrator — BLE lock gating', () => {
  it('stays far with no BLE samples, even if a zone is supplied', () => {
    const o = new TierOrchestrator();
    expect(o.update({ now: 1000, samples: [], zone: 'social' })).toBe('far');
    expect(o.isLocked).toBe(false);
  });

  it('does not lock on a single sample (needs a stable lock)', () => {
    const o = new TierOrchestrator();
    expect(
      o.update({ now: 1200, samples: [{ rssi: -60, at: 1200 }], zone: 'very_close' }),
    ).toBe('far');
  });

  it('promotes to BLE once the lock is stable (N samples in window)', () => {
    const o = new TierOrchestrator();
    const tier = o.update({ now: 1600, samples: recent(1600, 3), zone: 'very_close' });
    expect(tier).toBe('very_close');
    expect(o.isLocked).toBe(true);
  });

  it('floors a locked-but-weak signal at "close" (never far while locked)', () => {
    const o = new TierOrchestrator();
    o.update({ now: 1600, samples: recent(1600, 3), zone: 'far' });
    expect(o.tier).toBe('close');
  });
});

describe('TierOrchestrator — tier progression', () => {
  it('climbs far → close → very_close → social as the zone tightens', () => {
    const seen: Tier[] = [];
    const o = new TierOrchestrator({}, (t) => seen.push(t));

    // No lock yet.
    expect(o.update({ now: 800, samples: [], zone: 'far' })).toBe('far');
    // Lock + close.
    expect(o.update({ now: 1000, samples: recent(1000, 3), zone: 'close' })).toBe('close');
    // very_close.
    expect(o.update({ now: 1200, samples: recent(1200, 4), zone: 'very_close' })).toBe(
      'very_close',
    );
    // social.
    expect(o.update({ now: 1400, samples: recent(1400, 5), zone: 'social' })).toBe('social');

    expect(seen).toEqual(['close', 'very_close', 'social']);
  });
});

describe('TierOrchestrator — hysteresis (no flap on a brief drop)', () => {
  const cfg = { lockSamples: 3, lockWindowMs: 2_000, graceMs: 4_000 };

  it('keeps the BLE lock through a short signal gap', () => {
    const o = new TierOrchestrator(cfg);
    // Stable lock at very_close.
    expect(o.update({ now: 1000, samples: recent(1000, 3), zone: 'very_close' })).toBe(
      'very_close',
    );

    // Brief drop: window now empty (signal aged out → zone far), within grace.
    const t = o.update({ now: 1500, samples: [], zone: 'far' });
    expect(t).not.toBe('far'); // did NOT flap back to GPS
    expect(t).toBe('close'); // softened to the floor only
    expect(o.isLocked).toBe(true);
  });

  it('demotes to far only after the grace period of silence', () => {
    const o = new TierOrchestrator(cfg);
    o.update({ now: 1000, samples: recent(1000, 3), zone: 'very_close' });

    // Still within grace → stays locked (floored to close).
    expect(o.update({ now: 4500, samples: [], zone: 'far' })).toBe('close');
    expect(o.isLocked).toBe(true);

    // Past grace (now - lastSignal=1000 > 4000) → back to GPS far.
    const t = o.update({ now: 5050, samples: [], zone: 'far' });
    expect(t).toBe('far');
    expect(o.isLocked).toBe(false);
  });
});
