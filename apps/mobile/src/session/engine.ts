import type { ServerMessage, SessionState } from '@breakpoint/protocol';

import {
  outcomeFromEndedReason,
  outcomeFromState,
  recordTerminal,
  type HistoryOutcome,
} from '../local/historyStore';

import {
  onPeerSignal,
  startProximity,
  stopProximity,
  type PeerSignalEvent,
} from '../../modules/breakpoint-ble';
import { watchGps, type GpsWatchHandle } from '../location/gps';
import { requestProximityPermissions } from '../proximity/permissions';

import { ProximityPipeline } from './proximityPipeline';
import { SessionWsClient } from './wsClient';
import { useSessionStore, type ParticipantRole } from './store';

export interface StartSessionParams {
  sessionId: string;
  participantToken: string;
  role: ParticipantRole;
}

/**
 * End-to-end session engine. Wires the WS client, native BLE proximity, the
 * smoothing/orchestrator pipeline, GPS, and the Zustand store.
 *
 * BLE proximity starts only when the WS `session` frame delivers the bleUuid
 * (the sole source) — and exactly once, even across reconnects.
 */
export class SessionEngine {
  private ws: SessionWsClient | null = null;
  private pipeline: ProximityPipeline | null = null;
  private peerSub: { remove: () => void } | null = null;
  private gpsWatch: GpsWatchHandle | null = null;
  private proximityStarted = false;

  // History tracking: when the session went active, and a guard so each
  // session writes exactly one terminal entry no matter how it ends.
  private startedAt?: number;
  private terminalRecorded = false;
  /** Peer's label if the session ever exposes it (it doesn't today). */
  private peerLabel?: string;

  async start(params: StartSessionParams): Promise<void> {
    const store = useSessionStore.getState();
    store.setSession(params);
    store.setConnection('connecting');

    this.startedAt = undefined;
    this.terminalRecorded = false;
    this.peerLabel = undefined;

    this.pipeline = new ProximityPipeline({
      onTierChange: (tier) => {
        useSessionStore.getState().setTier(tier);
        this.ws?.sendTier(tier);
      },
    });

    this.ws = new SessionWsClient({
      sessionId: params.sessionId,
      participantToken: params.participantToken,
      onMessage: (msg) => this.onMessage(msg),
      onClose: ({ willReconnect }) =>
        useSessionStore
          .getState()
          .setConnection(willReconnect ? 'reconnecting' : 'closed'),
      onExhausted: () => {
        useSessionStore.getState().setError({
          kind: 'network',
          message: 'Connection lost. Check your network and try again.',
          phase: 'ws',
        });
        // Connection lost is a terminal outcome too.
        this.recordTerminalOnce('lost');
      },
    });
    this.ws.connect();

    const granted = await requestProximityPermissions();
    if (granted) {
      this.gpsWatch = await watchGps((fix) => {
        useSessionStore.getState().setMyGps(fix);
        this.ws?.sendGps(fix);
      });
    }
  }

  private onMessage(msg: ServerMessage): void {
    useSessionStore.getState().applyServerMessage(msg);

    // Track when the session first goes active (for duration).
    const state = stateOf(msg);
    if (state && isActive(state) && this.startedAt == null) {
      this.startedAt = Date.now();
    }

    // History: write exactly one rich entry on the first terminal signal,
    // whatever the path (met via `ended` reason, or a terminal `state`).
    if (msg.type === 'ended') {
      this.recordTerminalOnce(outcomeFromEndedReason(msg.reason));
    } else if (state) {
      const outcome = outcomeFromState(state);
      if (outcome) this.recordTerminalOnce(outcome);
    }

    // The `session` frame carries the bleUuid (also re-sent on reconnect).
    // Start native proximity exactly once.
    if (msg.type === 'session' && !this.proximityStarted) {
      this.proximityStarted = true;
      this.peerSub = onPeerSignal((e: PeerSignalEvent) => this.onSignal(e));
      startProximity(msg.bleUuid);
    }
  }

  /** Write the terminal history entry once per session. */
  private recordTerminalOnce(outcome: HistoryOutcome): void {
    if (this.terminalRecorded) return;
    this.terminalRecorded = true;
    void recordTerminal({
      outcome,
      peerLabel: this.peerLabel,
      startedAt: this.startedAt,
      endedAt: Date.now(),
    });
  }

  private onSignal(e: PeerSignalEvent): void {
    if (!this.pipeline) return;
    const { reading } = this.pipeline.push({ rssi: e.rssi, at: e.at });
    useSessionStore.getState().setProximity(reading);
  }

  /** Confirm the social moment → DO transitions the session to `ended`. */
  confirmMet(): void {
    this.ws?.sendMet();
  }

  /** Web / no-radio path: push a mocked RSSI sample into the same pipeline. */
  injectSignal(rssi: number, at: number): void {
    this.onSignal({ rssi, at });
  }

  stop(): void {
    this.gpsWatch?.remove();
    this.peerSub?.remove();
    this.peerSub = null;
    stopProximity();
    this.ws?.close();
    this.ws = null;
    this.proximityStarted = false;
  }
}

const ACTIVE_STATES: ReadonlySet<SessionState> = new Set<SessionState>([
  'active_gps',
  'active_ble',
  'social_handoff',
]);

function isActive(state: SessionState): boolean {
  return ACTIVE_STATES.has(state);
}

/** The session state carried by a server message, if any. */
function stateOf(msg: ServerMessage): SessionState | undefined {
  if (msg.type === 'session' || msg.type === 'state') return msg.state;
  return undefined;
}
