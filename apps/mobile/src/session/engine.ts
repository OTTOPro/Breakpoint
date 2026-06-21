import type { ServerMessage } from '@breakpoint/protocol';

import { recordEndedMeetup } from '../local/historyStore';

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

  async start(params: StartSessionParams): Promise<void> {
    const store = useSessionStore.getState();
    store.setSession(params);
    store.setConnection('connecting');

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
      onExhausted: () =>
        useSessionStore.getState().setError({
          kind: 'network',
          message: 'Connection lost. Check your network and try again.',
          phase: 'ws',
        }),
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

    // Tiny local-history hook: on a meetup ending, write one entry. Nothing else.
    if (msg.type === 'ended') {
      void recordEndedMeetup({ reason: msg.reason, at: Date.now() });
    }

    // The `session` frame carries the bleUuid (also re-sent on reconnect).
    // Start native proximity exactly once.
    if (msg.type === 'session' && !this.proximityStarted) {
      this.proximityStarted = true;
      this.peerSub = onPeerSignal((e: PeerSignalEvent) => this.onSignal(e));
      startProximity(msg.bleUuid);
    }
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
