import type { Tier } from '@breakpoint/protocol';

import type { ProximityReading, Trend } from '../proximity/smoothing';

/**
 * Pure visual mapping for the Finding screen — ported from the Claude Design
 * `BreakPoint.dc.html` logic so colors/states stay faithful.
 *
 * Setup screens stay calm and near-monochrome; the saturated accent is
 * reserved for Finding, where it tracks proximity continuously (cold→warm) and
 * cools back down on a wrong turn. No device needed — fully unit-testable.
 */

/** Calm, barely-cool setup background (kept quieter than Finding). */
export const SETUP_BG = '#E6EDF6';
/** Neutral surface used behind setup content blocks. */
export const SETUP_SURFACE = '#F5F6F7';

/** RSSI window mapped onto the 0–100 proximity scale used by the gradient. */
const RSSI_FLOOR = -90;
const RSSI_CEIL = -45;

/** Continuous proximity percent [0,100] from a smoothed RSSI value. */
export function proximityPercent(rssiSmoothed: number): number {
  const pct = ((rssiSmoothed - RSSI_FLOOR) / (RSSI_CEIL - RSSI_FLOOR)) * 100;
  return Math.max(0, Math.min(100, pct));
}

type Stop = readonly [number, string];
const GRAD_STOPS: readonly Stop[] = [
  [0, '#C7DBE2'], // blue
  [50, '#CECBF6'], // lavender
  [80, '#F4C0D1'], // soft pink
  [100, '#ED93B1'], // hot pink
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function hexLerp(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const r = Math.round(lerp(A[0], B[0], t));
  const g = Math.round(lerp(A[1], B[1], t));
  const bl = Math.round(lerp(A[2], B[2], t));
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Continuous cold→warm gradient color for a proximity percent. */
export function gradColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  for (let i = 0; i < GRAD_STOPS.length - 1; i++) {
    const [p0, c0] = GRAD_STOPS[i]!;
    const [p1, c1] = GRAD_STOPS[i + 1]!;
    if (p <= p1) return hexLerp(c0, c1, (p - p0) / (p1 - p0));
  }
  return GRAD_STOPS[GRAD_STOPS.length - 1]![1];
}

/** Dark, same-family ink color for text over the accent. */
export function inkColor(pct: number): string {
  if (pct >= 80) return '#72243E';
  if (pct >= 50) return '#3C3489';
  return '#2C4A54';
}

/** When cooling, shift the accent back toward blue (a visible step down). */
export function coolingShift(pct: number): number {
  return Math.max(2, pct - 32);
}

export interface FindingVisual {
  accent: string;
  ink: string;
  title: string;
  sub: string;
  showArrow: boolean;
  showRadar: boolean;
  showMeters: boolean;
  isHere: boolean;
  isCooling: boolean;
  proximityPercent: number;
}

const TIER_COPY: Record<Tier, { title: string; sub: string }> = {
  far: { title: 'Follow the arrow', sub: 'they’re this way' },
  close: { title: 'Getting warmer', sub: 'signal locked · map fading' },
  very_close: { title: 'Almost on them', sub: 'you’re hot — look around' },
  social: { title: 'You’re here', sub: 'look up' },
};

/**
 * Map the live store state (tier + smoothed proximity + trend) to the Finding
 * screen's visual state.
 */
export function findingVisual(input: {
  tier: Tier;
  reading: ProximityReading | null;
}): FindingVisual {
  const { tier, reading } = input;
  const trend: Trend = reading?.trend ?? 'steady';
  const rssi = reading?.rssiSmoothed ?? RSSI_FLOOR;

  const isHere = tier === 'social';
  const isCooling = trend === 'cooling' && !isHere;

  const basePct = proximityPercent(rssi);
  const pct = isCooling ? coolingShift(basePct) : basePct;
  const accent = gradColor(pct);
  const ink = inkColor(pct);

  const copy = isCooling
    ? { title: 'You’re cooling', sub: 'wrong way — turn around' }
    : TIER_COPY[tier];

  return {
    accent,
    ink,
    title: copy.title,
    sub: copy.sub,
    showArrow: tier === 'far' || tier === 'close',
    showRadar: tier === 'close' || tier === 'very_close',
    showMeters: (tier === 'far' || tier === 'close') && !isHere,
    isHere,
    isCooling,
    proximityPercent: pct,
  };
}
