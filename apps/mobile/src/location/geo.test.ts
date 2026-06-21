import { describe, it, expect } from 'vitest';

import { bearing, haversineDistance } from './geo';

describe('haversineDistance', () => {
  it('is zero for identical points', () => {
    expect(haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it('matches ~111.2 km for 1° of longitude at the equator', () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('matches the known Paris → London great-circle distance (~343 km)', () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const d = haversineDistance(paris, london);
    expect(d).toBeGreaterThan(340_000);
    expect(d).toBeLessThan(347_000);
  });

  it('is symmetric', () => {
    const a = { lat: 45.5, lng: -73.6 };
    const b = { lat: 40.7, lng: -74.0 };
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6);
  });
});

describe('bearing', () => {
  const origin = { lat: 0, lng: 0 };

  it('points east (90°) for a step in +longitude', () => {
    expect(bearing(origin, { lat: 0, lng: 1 })).toBeCloseTo(90, 4);
  });

  it('points north (0°) for a step in +latitude', () => {
    expect(bearing(origin, { lat: 1, lng: 0 })).toBeCloseTo(0, 4);
  });

  it('points west (270°) for a step in -longitude', () => {
    expect(bearing(origin, { lat: 0, lng: -1 })).toBeCloseTo(270, 4);
  });

  it('points south (180°) for a step in -latitude', () => {
    expect(bearing(origin, { lat: -1, lng: 0 })).toBeCloseTo(180, 4);
  });

  it('always returns a value in [0, 360)', () => {
    const b = bearing({ lat: 10, lng: 20 }, { lat: -5, lng: -30 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});
