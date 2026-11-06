import type { ServerMessage, SessionState } from '@breakpoint/protocol';

import {
  outcomeFromEndedReason,
  outcomeFromState,
  recordTerminal,
  type HistoryOutcome,
} from '../local/historyStore';

import {
  onPeerSignal,
  onProximityError,
  startProximity,
  stopProximity,
  type PeerSignalEvent,
  type ProximityErrorCode,
} from '../../modules/breakpoint-ble';
import { watchGps, type GpsWatchHandle } from '../location/gps';
import { requestProximityPermissions } from '../proximity/permissions';

import { ProximityPipeline } from './proximityPipeline';
import { SessionWsClient } from './wsClient';
import { useSessionStore, type ParticipantRole, type RadioIssue } from './store';

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
  private errorSub: { remove: () => void } | null = null;
  private gpsWatch: GpsWatchHandle | null = null;
  private proximityStarted = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  /** Resolves once the user has answered the permission prompts. */
  private permission: Promise<boolean> = Promise.resolve(false);
  /** False once stop() ran, so late async work does not restart anything. */
  private running = false;

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
    this.running = true;
    store.setRadioIssue(null);

    // Ask first, before the socket can deliver the session frame: on Android
    // 12+ scanning or advertising without the Bluetooth permissions throws in
    // the native service. Radio and GPS both wait on this answer.
    this.permission = requestProximityPermissions().catch(() => false);

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

    const granted = await this.permission;
    if (granted && this.running) {
      const watch = await watchGps((fix) => {
        useSessionStore.getState().setMyGps(fix);
        this.ws?.sendGps(fix);
      });
      // The user may have left while the watch was starting.
      if (this.running) this.gpsWatch = watch;
      else watch.remove();
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
      void this.startRadio(msg.bleUuid);
    }
  }

  /** Start advertising and scanning, but only once permission is granted. */
  private async startRadio(bleUuid: string): Promise<void> {
    const granted = await this.permission;
    if (!this.running) return;
    if (!granted) {
      useSessionStore.getState().setRadioIssue('permission_denied');
      return;
    }
    this.peerSub = onPeerSignal((e: PeerSignalEvent) => this.onSignal(e));
    this.errorSub = onProximityError((e) =>
      useSessionStore.getState().setRadioIssue(radioIssueFor(e.code)),
    );
    startProximity(bleUuid);
    this.tickTimer = setInterval(() => this.onTick(Date.now()), TICK_MS);
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

  /** Age the signal even when the radio is silent (peer out of range). */
  private onTick(now: number): void {
    if (!this.pipeline) return;
    const { reading } = this.pipeline.tick(now);
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

  /**
   * The user leaves: tell the other phone through the server, then stop.
   * Sent before the socket closes, so the peer sees "left" at once instead of
   * waiting for the session to expire.
   */
  leave(): void {
    this.ws?.sendLeave();
    this.stop();
  }

  stop(): void {
    this.running = false;
    this.gpsWatch?.remove();
    this.gpsWatch = null;
    this.peerSub?.remove();
    this.peerSub = null;
    this.errorSub?.remove();
    this.errorSub = null;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    stopProximity();
    this.ws?.close();
    this.ws = null;
    this.proximityStarted = false;
  }
}

/** Map a native failure to what the Finding screen tells the user. */
export function radioIssueFor(code: ProximityErrorCode): RadioIssue {
  switch (code) {
    case 'bluetooth_off':
      return 'bluetooth_off';
    case 'unauthorized':
      return 'permission_denied';
    case 'unsupported':
      return 'unsupported';
    default:
      return 'failed';
  }
}

/** How often the proximity signal is re-evaluated without a new sample. */
const TICK_MS = 1_000;

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
