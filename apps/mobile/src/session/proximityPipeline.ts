import type { Tier } from '@breakpoint/protocol';

import {
  computeProximity,
  type ProximityOptions,
  type ProximityReading,
  type RssiSample,
} from '../proximity/smoothing';
import {
  TierOrchestrator,
  type OrchestratorConfig,
} from './orchestrator';

export type ProximityPipelineOptions = {
  /** Sliding window kept for smoothing + lock detection, in ms. */
  windowMs?: number;
  smoothing?: ProximityOptions;
  orchestrator?: Partial<OrchestratorConfig>;
  onTierChange?: (tier: Tier) => void;
};

const DEFAULT_WINDOW_MS = 2_000;

/**
 * Pure proximity pipeline — NO native, NO React Native. Buffers raw RSSI,
 * smooths to a zone, and runs the {@link TierOrchestrator}.
 *
 * This is the injectable signal source: the real engine feeds it from
 * `onPeerSignal`, while tests (and the web no-op path) push mocked RSSI.
 */
export class ProximityPipeline {
  private samples: RssiSample[] = [];
  private readonly windowMs: number;
  private readonly smoothing?: ProximityOptions;
  private readonly orchestrator: TierOrchestrator;

  constructor(opts: ProximityPipelineOptions = {}) {
    this.windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
    this.smoothing = opts.smoothing;
    this.orchestrator = new TierOrchestrator(
      opts.orchestrator ?? {},
      opts.onTierChange,
    );
  }

  /** Feed one raw sample; returns the latest reading + displayed tier. */
  push(
    sample: RssiSample,
    distanceM?: number,
  ): { reading: ProximityReading; tier: Tier } {
    this.samples.push(sample);
    const cutoff = sample.at - this.windowMs;
    this.samples = this.samples.filter((s) => s.at >= cutoff);

    const reading = computeProximity(this.samples, this.smoothing);
    const tier = this.orchestrator.update({
      now: sample.at,
      samples: this.samples,
      zone: reading.zone,
      distanceM,
    });
    return { reading, tier };
  }

  get tier(): Tier {
    return this.orchestrator.tier;
  }

  reset(): void {
    this.samples = [];
    this.orchestrator.reset();
  }
}
