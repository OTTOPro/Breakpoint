import type { Tier } from '@breakpoint/protocol';

/**
 * Proximity smoothing — PURE, device-free, unit-testable.
 *
 * The native BLE layer emits raw `{ rssi, at }` samples. Everything that turns
 * that noisy stream into a stable zone + trend lives here in JS so it can be
 * tuned without recompiling native, and tested without a phone.
 *
 * RSSI is negative dBm: closer to 0 = stronger signal = nearer.
 */

/** A raw signal sample (mirrors the native `onPeerSignal` payload). */
export type RssiSample = {
  rssi: number;
  at: number;
};

/** Proximity zone. Reuses the shared protocol `Tier`. */
export type Zone = Tier;

/** Direction the smoothed signal is moving. */
export type Trend = 'warming' | 'cooling' | 'steady';

export type ProximityReading = {
  zone: Zone;
  trend: Trend;
  /** Exponentially-smoothed RSSI in dBm. */
  rssiSmoothed: number;
};

export type ProximityOptions = {
  /** EMA smoothing factor in (0, 1]. Lower = smoother / more lag. */
  alpha?: number;
  /** How many smoothed steps back to look when computing the trend. */
  trendLookback?: number;
  /** Minimum dBm slope (over the lookback) to call warming/cooling. */
  trendEps?: number;
};

/** RSSI thresholds (dBm) for each zone boundary, strongest first. */
export const ZONE_THRESHOLDS: ReadonlyArray<{ zone: Zone; minRssi: number }> = [
  { zone: 'social', minRssi: -50 },
  { zone: 'very_close', minRssi: -65 },
  { zone: 'close', minRssi: -78 },
];

/** Signal floor used when there are no samples yet. */
export const NO_SIGNAL_RSSI = -127;

const DEFAULT_ALPHA = 0.25;
const DEFAULT_TREND_LOOKBACK = 4;
const DEFAULT_TREND_EPS = 1.5;

/** Rank a zone from widest (far=0) to tightest (social=3). */
export function zoneRank(zone: Zone): number {
  switch (zone) {
    case 'social':
      return 3;
    case 'very_close':
      return 2;
    case 'close':
      return 1;
    default:
      return 0;
  }
}

/** Map a single (already-smoothed) RSSI value to a zone. */
export function rssiToZone(rssi: number): Zone {
  for (const { zone, minRssi } of ZONE_THRESHOLDS) {
    if (rssi >= minRssi) return zone;
  }
  return 'far';
}

/**
 * Exponential moving average over a sequence of values.
 * Returns the smoothed value at every step (same length as input).
 */
export function emaSeries(values: readonly number[], alpha = DEFAULT_ALPHA): number[] {
  if (values.length === 0) return [];
  const out: number[] = [values[0]!];
  let prev = values[0]!;
  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i]! + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/**
 * Turn a window of raw samples into a stable zone + trend. PURE.
 *
 * @param samples raw RSSI samples in chronological order (oldest first)
 */
export function computeProximity(
  samples: readonly RssiSample[],
  opts: ProximityOptions = {},
): ProximityReading {
  if (samples.length === 0) {
    return { zone: 'far', trend: 'steady', rssiSmoothed: NO_SIGNAL_RSSI };
  }

  const alpha = opts.alpha ?? DEFAULT_ALPHA;
  const eps = opts.trendEps ?? DEFAULT_TREND_EPS;
  const lookbackOpt = opts.trendLookback ?? DEFAULT_TREND_LOOKBACK;

  const ema = emaSeries(
    samples.map((s) => s.rssi),
    alpha,
  );
  const rssiSmoothed = ema[ema.length - 1]!;
  const zone = rssiToZone(rssiSmoothed);

  const lookback = Math.min(lookbackOpt, ema.length - 1);
  const past = ema[ema.length - 1 - lookback]!;
  const slope = rssiSmoothed - past;
  const trend: Trend =
    slope > eps ? 'warming' : slope < -eps ? 'cooling' : 'steady';

  return { zone, trend, rssiSmoothed };
}
