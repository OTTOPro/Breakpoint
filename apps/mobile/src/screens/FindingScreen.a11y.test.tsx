import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProximityPipeline } from '../session/proximityPipeline';
import { useSessionStore } from '../session/store';

import { FindingScreen } from './FindingScreen';

afterEach(cleanup);
beforeEach(() => useSessionStore.getState().reset());

function drive(ramp: number[], stepMs = 150) {
  const pipe = new ProximityPipeline();
  const t0 = 1_000_000;
  let last = { reading: null as ReturnType<ProximityPipeline['push']>['reading'] | null, tier: 'far' as const };
  ramp.forEach((rssi, i) => {
    last = pipe.push({ rssi, at: t0 + i * stepMs }) as typeof last;
  });
  const st = useSessionStore.getState();
  if (last.reading) st.setProximity(last.reading);
  st.setTier(last.tier);
}
const repeat = (rssi: number, n: number) => Array.from({ length: n }, () => rssi);

const TIERS: { ramp: number[]; phrase: string }[] = [
  { ramp: [-86], phrase: 'Follow the arrow' },
  { ramp: repeat(-72, 8), phrase: 'Getting warmer' },
  { ramp: repeat(-60, 8), phrase: 'Almost on them' },
  { ramp: repeat(-44, 8), phrase: 'here' },
];

describe('FindingScreen — accessibility (proximity is never colour-only)', () => {
  it('exposes a non-colour textual signal at every tier', () => {
    const titles = new Set<string>();
    for (const { ramp, phrase } of TIERS) {
      useSessionStore.getState().reset();
      drive(ramp);
      const r = render(<FindingScreen />);
      const title = r.getByTestId('finding-title').textContent ?? '';
      expect(title).toContain(phrase); // readable without any colour
      titles.add(title);
      cleanup();
    }
    // Each tier has a distinct textual state.
    expect(titles.size).toBe(TIERS.length);
  });

  it('provides a screen-reader label describing the proximity state', () => {
    drive(repeat(-60, 8)); // very_close
    const r = render(<FindingScreen />);
    const label = r.getByTestId('finding-status').getAttribute('aria-label') ?? '';
    expect(label.length).toBeGreaterThan(0);
    expect(label).toContain('Almost on them');
    expect(label.toLowerCase()).toContain('contact');
  });

  it('labels the main control for screen readers', () => {
    drive([-86]);
    const r = render(<FindingScreen />);
    expect(r.getByTestId('finding-exit').getAttribute('aria-label')).toBe('Leave session');
  });
});
