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

/** RSSI boundaries (dBm) for each zone — strongest zone first. */
export type ZoneThresholds = {
  social: number;
  very_close: number;
  close: number;
};

export type ProximityOptions = {
  /** EMA smoothing factor in (0, 1]. Lower = smoother / more lag. */
  alpha?: number;
  /** How many smoothed steps back to look when computing the trend. */
  trendLookback?: number;
  /** Minimum dBm slope (over the lookback) to call warming/cooling. */
  trendEps?: number;
  /** Zone boundaries (dBm). Defaults to {@link DEFAULT_ZONE_THRESHOLDS}. */
  zoneThresholds?: ZoneThresholds;
};

/** Default RSSI → zone boundaries (dBm). */
export const DEFAULT_ZONE_THRESHOLDS: ZoneThresholds = {
  social: -50,
  very_close: -65,
  close: -78,
};

/** RSSI thresholds (dBm) for each zone boundary, strongest first. */
export const ZONE_THRESHOLDS: ReadonlyArray<{ zone: Zone; minRssi: number }> = [
  { zone: 'social', minRssi: DEFAULT_ZONE_THRESHOLDS.social },
  { zone: 'very_close', minRssi: DEFAULT_ZONE_THRESHOLDS.very_close },
  { zone: 'close', minRssi: DEFAULT_ZONE_THRESHOLDS.close },
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

/** Map a single (already-smoothed) RSSI value to a zone (default thresholds). */
export function rssiToZone(rssi: number): Zone {
  return zoneFor(rssi, DEFAULT_ZONE_THRESHOLDS);
}

/** Map an RSSI value to a zone using explicit (tunable) thresholds. */
export function zoneFor(rssi: number, t: ZoneThresholds): Zone {
  if (rssi >= t.social) return 'social';
  if (rssi >= t.very_close) return 'very_close';
  if (rssi >= t.close) return 'close';
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

  const thresholds = opts.zoneThresholds ?? DEFAULT_ZONE_THRESHOLDS;
  const ema = emaSeries(
    samples.map((s) => s.rssi),
    alpha,
  );
  const rssiSmoothed = ema[ema.length - 1]!;
  const zone = zoneFor(rssiSmoothed, thresholds);

  const lookback = Math.min(lookbackOpt, ema.length - 1);
  const past = ema[ema.length - 1 - lookback]!;
  const slope = rssiSmoothed - past;
  const trend: Trend =
    slope > eps ? 'warming' : slope < -eps ? 'cooling' : 'steady';

  return { zone, trend, rssiSmoothed };
}
