import {
  onPeerSignal,
  startProximity,
  stopProximity,
  type PeerSignalEvent,
} from '../../modules/breakpoint-ble';

import { requestProximityPermissions } from './permissions';
import {
  computeProximity,
  type ProximityOptions,
  type ProximityReading,
  type RssiSample,
} from './smoothing';

export type ProximityTrackerOptions = ProximityOptions & {
  /** Sliding window kept for smoothing, in ms (default 2000). */
  windowMs?: number;
};

const DEFAULT_WINDOW_MS = 2_000;

/**
 * Runtime glue: requests permissions, starts native advertise+scan for a
 * session UUID, smooths the raw RSSI stream, and pushes stable
 * `{ zone, trend, rssiSmoothed }` readings to a callback.
 *
 * All proximity math lives in the pure {@link computeProximity}; this class
 * only buffers samples and wires the native event.
 */
export class ProximityTracker {
  private samples: RssiSample[] = [];
  private subscription: { remove(): void } | null = null;
  private readonly windowMs: number;
  private readonly opts: ProximityOptions;

  constructor(
    private readonly onReading: (reading: ProximityReading) => void,
    options: ProximityTrackerOptions = {},
  ) {
    const { windowMs, ...smoothing } = options;
    this.windowMs = windowMs ?? DEFAULT_WINDOW_MS;
    this.opts = smoothing;
  }

  /** Request permissions and begin advertising + scanning. */
  async start(sessionUuid: string): Promise<boolean> {
    const granted = await requestProximityPermissions();
    if (!granted) return false;

    this.samples = [];
    this.subscription = onPeerSignal((event) => this.onSample(event));
    startProximity(sessionUuid);
    return true;
  }

  /** Stop scanning and tear down the listener. */
  stop(): void {
    stopProximity();
    this.subscription?.remove();
    this.subscription = null;
    this.samples = [];
  }

  private onSample(event: PeerSignalEvent): void {
    this.samples.push({ rssi: event.rssi, at: event.at });
    const cutoff = event.at - this.windowMs;
    this.samples = this.samples.filter((s) => s.at >= cutoff);
    this.onReading(computeProximity(this.samples, this.opts));
  }
}
