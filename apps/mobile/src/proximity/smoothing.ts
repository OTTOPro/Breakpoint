import type { Tier } from '@breakpoint/protocol';

/**
 * Proximity smoothing: PURE, device-free, unit-testable.
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

/** RSSI boundaries (dBm) for each zone, strongest zone first. */
export type ZoneThresholds = {
  social: number;
  very_close: number;
  close: number;
};

export type ProximityOptions = {
  /** EMA smoothing factor in (0, 1]. Lower = smoother / more lag. */
  alpha?: number;
  /** How far back the trend looks, in ms. */
  trendWindowMs?: number;
  /** Minimum slope, in dB per second, to call warming or cooling. */
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
export const ZONE_THRESHOLDS: readonly { zone: Zone; minRssi: number }[] = [
  { zone: 'social', minRssi: DEFAULT_ZONE_THRESHOLDS.social },
  { zone: 'very_close', minRssi: DEFAULT_ZONE_THRESHOLDS.very_close },
  { zone: 'close', minRssi: DEFAULT_ZONE_THRESHOLDS.close },
];

/** Signal floor used when there are no samples yet. */
export const NO_SIGNAL_RSSI = -127;

/**
 * Whether a raw RSSI value is a real measurement. CoreBluetooth reports 127
 * when the value is unavailable, and a non-negative value is never a real BLE
 * reading; treated as a sample it would look like the strongest possible
 * signal and jump straight to "You're here".
 */
export function isUsableRssi(rssi: number): boolean {
  return Number.isFinite(rssi) && rssi < 0 && rssi >= NO_SIGNAL_RSSI;
}

const DEFAULT_ALPHA = 0.25;
const DEFAULT_TREND_WINDOW_MS = 3_000;
const DEFAULT_TREND_EPS = 1;
/** Fewer samples or a shorter span than this is not a trend, just noise. */
const MIN_TREND_SAMPLES = 4;
const MIN_TREND_SPAN_MS = 1_000;

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
  const trendWindowMs = opts.trendWindowMs ?? DEFAULT_TREND_WINDOW_MS;

  const thresholds = opts.zoneThresholds ?? DEFAULT_ZONE_THRESHOLDS;
  const ema = emaSeries(
    samples.map((s) => s.rssi),
    alpha,
  );
  const rssiSmoothed = ema[ema.length - 1]!;
  const zone = zoneFor(rssiSmoothed, thresholds);

  const slope = trendSlope(samples, trendWindowMs);
  const trend: Trend =
    slope === null ? 'steady' : slope > eps ? 'warming' : slope < -eps ? 'cooling' : 'steady';

  return { zone, trend, rssiSmoothed };
}

/**
 * Least-squares slope of the raw signal over the last `windowMs`, in dB per
 * second. Measured against time, not sample count, so it means the same thing
 * whether the radio reports ten times a second or once. Fitting a line over a
 * few seconds averages out the multipath noise that makes single RSSI
 * readings useless as a distance. Returns null when there is too little data
 * to call it a trend.
 */
export function trendSlope(
  samples: readonly RssiSample[],
  windowMs = DEFAULT_TREND_WINDOW_MS,
): number | null {
  if (samples.length === 0) return null;
  const end = samples[samples.length - 1]!.at;
  const recent = samples.filter((s) => s.at >= end - windowMs);
  if (recent.length < MIN_TREND_SAMPLES) return null;
  if (end - recent[0]!.at < MIN_TREND_SPAN_MS) return null;

  const n = recent.length;
  const meanT = recent.reduce((sum, s) => sum + s.at, 0) / n;
  const meanR = recent.reduce((sum, s) => sum + s.rssi, 0) / n;
  let num = 0;
  let den = 0;
  for (const s of recent) {
    num += (s.at - meanT) * (s.rssi - meanR);
    den += (s.at - meanT) ** 2;
  }
  if (den === 0) return null;
  return (num / den) * 1_000;
}
