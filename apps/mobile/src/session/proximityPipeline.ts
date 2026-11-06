import type { Tier } from '@breakpoint/protocol';

import { getProximityConfig } from '../proximity/proximityConfig';
import {
  NO_SIGNAL_RSSI,
  computeProximity,
  isUsableRssi,
  type ProximityOptions,
  type ProximityReading,
  type RssiSample,
  type Trend,
  type Zone,
} from '../proximity/smoothing';
import {
  TierOrchestrator,
  type OrchestratorConfig,
} from './orchestrator';

export type ProximityPipelineOptions = {
  /** Explicit overrides (tests). When omitted, the live proximityConfig is used. */
  windowMs?: number;
  smoothing?: ProximityOptions;
  orchestrator?: Partial<OrchestratorConfig>;
  onTierChange?: (tier: Tier) => void;
};

/** Everything the diagnostics readout + sparkline need from one push. */
export interface PipelineSnapshot {
  reading: ProximityReading;
  tier: Tier;
  raw: number;
  rssiSmoothed: number;
  zone: Zone;
  trend: Trend;
  locked: boolean;
  /** Samples within the lock window at this instant. */
  lockCount: number;
  samples: RssiSample[];
}

/**
 * Pure proximity pipeline: NO native, NO React Native. Buffers raw RSSI,
 * smooths to a zone, and runs the {@link TierOrchestrator}.
 *
 * It reads the live {@link getProximityConfig} on every push (so the
 * diagnostics screen can tune in real time), unless explicit overrides were
 * passed to the constructor. This is the SAME pipeline the app/engine uses, 
 * the diagnostics screen drives this exact class, no parallel logic.
 */
export class ProximityPipeline {
  private samples: RssiSample[] = [];
  private readonly explicitWindowMs?: number;
  private readonly explicitSmoothing?: ProximityOptions;
  private readonly explicitOrchestrator?: Partial<OrchestratorConfig>;
  private readonly orchestrator: TierOrchestrator;

  constructor(opts: ProximityPipelineOptions = {}) {
    this.explicitWindowMs = opts.windowMs;
    this.explicitSmoothing = opts.smoothing;
    this.explicitOrchestrator = opts.orchestrator;
    this.orchestrator = new TierOrchestrator(
      opts.orchestrator ?? {},
      opts.onTierChange,
    );
  }

  /** Feed one raw sample; returns the latest snapshot. */
  push(sample: RssiSample, distanceM?: number): PipelineSnapshot {
    if (!isUsableRssi(sample.rssi)) return this.tick(sample.at, distanceM);
    this.samples.push(sample);
    return this.evaluate(sample.at, sample.rssi, distanceM);
  }

  /**
   * Re-evaluate without a new sample. The radio only reports when it hears the
   * peer, so silence produces no events at all: without a clock, the last
   * reading would stay on screen forever and the lock would never time out.
   * The engine calls this on a timer so old samples age out of the window and
   * the orchestrator can drop the lock after its grace period.
   */
  tick(now: number, distanceM?: number): PipelineSnapshot {
    const last = this.samples[this.samples.length - 1];
    return this.evaluate(now, last?.rssi ?? NO_SIGNAL_RSSI, distanceM);
  }

  private evaluate(now: number, raw: number, distanceM?: number): PipelineSnapshot {
    const cfg = getProximityConfig();

    const windowMs = this.explicitWindowMs ?? cfg.windowMs;
    const smoothing: ProximityOptions =
      this.explicitSmoothing ?? {
        alpha: cfg.alpha,
        trendWindowMs: cfg.trendWindowMs,
        trendEps: cfg.trendEps,
        zoneThresholds: cfg.zoneThresholds,
      };
    // Live-tune the orchestrator unless the constructor pinned it.
    if (!this.explicitOrchestrator) {
      this.orchestrator.setConfig({
        lockSamples: cfg.lockSamples,
        lockWindowMs: cfg.lockWindowMs,
        graceMs: cfg.graceMs,
        minBleTier: cfg.minBleTier,
      });
    }

    const cutoff = now - windowMs;
    this.samples = this.samples.filter((s) => s.at >= cutoff);

    const reading = computeProximity(this.samples, smoothing);
    const tier = this.orchestrator.update({
      now,
      samples: this.samples,
      zone: reading.zone,
      distanceM,
    });

    const lockWindowMs = this.explicitOrchestrator?.lockWindowMs ?? cfg.lockWindowMs;
    const lockCount = this.samples.filter(
      (s) => s.at >= now - lockWindowMs,
    ).length;

    return {
      reading,
      tier,
      raw,
      rssiSmoothed: reading.rssiSmoothed,
      zone: reading.zone,
      trend: reading.trend,
      locked: this.orchestrator.isLocked,
      lockCount,
      samples: [...this.samples],
    };
  }

  get tier(): Tier {
    return this.orchestrator.tier;
  }

  reset(): void {
    this.samples = [];
    this.orchestrator.reset();
  }
}
