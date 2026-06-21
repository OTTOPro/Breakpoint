import { describe, expect, it } from 'vitest';

import { toPolylinePoints } from './Sparkline';

const SCALE = { width: 100, height: 50, min: -100, max: -40 };

describe('toPolylinePoints', () => {
  it('returns empty for no data', () => {
    expect(toPolylinePoints([], SCALE)).toBe('');
  });

  it('spreads points across the width and maps stronger signal higher (smaller y)', () => {
    const pts = toPolylinePoints([-90, -70, -50], SCALE);
    const coords = pts.split(' ').map((c) => c.split(',').map(Number));
    expect(coords).toHaveLength(3);
    expect(coords[0]![0]).toBe(0); // first x
    expect(coords[2]![0]).toBe(100); // last x = width
    // -50 (stronger) sits higher on screen than -90 (weaker) → smaller y.
    expect(coords[2]![1]).toBeLessThan(coords[0]![1]);
  });

  it('clamps out-of-range values', () => {
    const pts = toPolylinePoints([-200, 0], SCALE);
    const ys = pts.split(' ').map((c) => Number(c.split(',')[1]));
    expect(ys[0]).toBe(50); // clamped to min → bottom
    expect(ys[1]).toBe(0); // clamped to max → top
  });
});
