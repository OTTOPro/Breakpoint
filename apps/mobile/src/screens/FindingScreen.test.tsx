import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProximityPipeline } from '../session/proximityPipeline';
import { useSessionStore } from '../session/store';
import { SETUP_BG } from '../ui/proximityVisual';

import { FindingScreen } from './FindingScreen';

afterEach(cleanup);
beforeEach(() => useSessionStore.getState().reset());

/**
 * Drive the store the way the engine does in 2.3: push raw RSSI through the
 * injectable ProximityPipeline, then write the resulting reading + tier into
 * the store. Returns the last reading/tier.
 */
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
  return last;
}

const repeat = (rssi: number, n: number) => Array.from({ length: n }, () => rssi);

function parseRgb(s: string): [number, number, number] {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s);
  if (!m) throw new Error(`not an rgb string: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function accentOf(): string {
  // The Finding screen surfaces its live accent in a probe node.
  return render(<FindingScreen />).getByTestId('finding-accent').textContent ?? '';
}

describe('FindingScreen — state-driven render per tier', () => {
  it('far → arrow, no radar, no social ("Follow the arrow")', () => {
    drive([-86]); // one weak sample: no BLE lock → far
    const r = render(<FindingScreen />);
    expect(useSessionStore.getState().tier).toBe('far');
    expect(r.getByTestId('finding-arrow')).toBeTruthy();
    expect(r.queryByTestId('finding-radar')).toBeNull();
    expect(r.queryByTestId('finding-social')).toBeNull();
    expect(r.getByTestId('finding-title').textContent).toContain('Follow the arrow');
  });

  it('close → radar appears ("Getting warmer")', () => {
    drive(repeat(-72, 8)); // stable lock, zone close
    const r = render(<FindingScreen />);
    expect(useSessionStore.getState().tier).toBe('close');
    expect(r.getByTestId('finding-radar')).toBeTruthy();
    expect(r.queryByTestId('finding-social')).toBeNull();
    expect(r.getByTestId('finding-title').textContent).toContain('Getting warmer');
  });

  it('very_close → radar, no arrow ("Almost on them")', () => {
    drive(repeat(-60, 8)); // zone very_close
    const r = render(<FindingScreen />);
    expect(useSessionStore.getState().tier).toBe('very_close');
    expect(r.getByTestId('finding-radar')).toBeTruthy();
    expect(r.queryByTestId('finding-arrow')).toBeNull();
    expect(r.getByTestId('finding-title').textContent).toContain('Almost on them');
  });

  it('social → social moment overlay ("You’re here")', () => {
    drive(repeat(-44, 8)); // zone social
    const r = render(<FindingScreen />);
    expect(useSessionStore.getState().tier).toBe('social');
    expect(r.getByTestId('finding-social')).toBeTruthy();
    expect(r.queryByTestId('finding-arrow')).toBeNull();
    expect(r.getByTestId('finding-title').textContent).toContain('here');
  });
});

describe('FindingScreen — accent tracks proximity (continuous, both directions)', () => {
  it('warms from blue (far) to pink (social)', () => {
    drive([-86]);
    const far = parseRgb(accentOf());
    cleanup();
    useSessionStore.getState().reset();

    drive(repeat(-44, 8));
    const social = parseRgb(accentOf());

    // Pink is much redder than blue; blue side is bluer than pink side.
    expect(social[0]).toBeGreaterThan(far[0]); // more red as we get warm
    expect(far[2]).toBeGreaterThan(social[2]); // more blue when far
  });

  it('cools the accent back down on a wrong turn (trend = cooling)', () => {
    // Warm up close, then walk away → falling signal → cooling.
    const ramp = [
      -80, -70, -62, -56, -52, -50, -50, // approaching
      -58, -66, -72, -76, -78, -80, // walking away
    ];
    const last = drive(ramp);
    expect(last.reading?.trend).toBe('cooling');

    const r = render(<FindingScreen />);
    // Cooling copy overrides the tier copy.
    expect(r.getByTestId('finding-title').textContent).toContain('cooling');

    const cooled = parseRgb(r.getByTestId('finding-accent').textContent ?? '');
    cleanup();
    useSessionStore.getState().reset();

    // Compare against a steady warm reading at a similar proximity.
    drive(repeat(-52, 8));
    const warm = parseRgb(accentOf());

    // Cooling visibly steps the accent back toward blue (less red, more blue).
    expect(cooled[0]).toBeLessThan(warm[0]);
    expect(cooled[2]).toBeGreaterThan(warm[2]);
  });
});

describe('throughline — setup stays calmer than Finding', () => {
  function saturationRange(rgb: [number, number, number]): number {
    return Math.max(...rgb) - Math.min(...rgb);
  }
  function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  it('the setup background is far less saturated than the social accent', () => {
    drive(repeat(-44, 8));
    const socialAccent = parseRgb(accentOf());
    const setup = hexToRgb(SETUP_BG);

    expect(saturationRange(setup)).toBeLessThan(saturationRange(socialAccent));
  });
});
