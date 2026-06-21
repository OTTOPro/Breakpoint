import {
  parseServerMessage,
  type ClientMessage,
  type GpsFix,
  type ServerMessage,
  type Tier,
} from '@breakpoint/protocol';

import { getBaseUrl } from './api';

export interface WsClientOptions {
  sessionId: string;
  participantToken: string;
  /** Defaults to {@link getBaseUrl}. */
  baseUrl?: string;
  onMessage: (msg: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: (info: { willReconnect: boolean }) => void;
  /** Called once when reconnection attempts are exhausted (clear "lost" state). */
  onExhausted?: () => void;
  /** Auto-reconnect on unexpected close (default true). */
  reconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  /** Max reconnect attempts before giving up (default 6). */
  maxReconnectAttempts?: number;
  /** Injectable socket constructor (tests). Defaults to `new WebSocket(url)`. */
  socketFactory?: (url: string) => WebSocket;
}

/**
 * WebSocket client to the Session DO. Sends gps/tier/leave/met, dispatches
 * validated server messages, and reconnects automatically. On reconnect the DO
 * re-delivers the `session` frame (bleUuid + state), so callers just re-handle
 * it — no special-casing here.
 */
export class SessionWsClient {
  private ws: WebSocket | null = null;
  private closedByUs = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly opts: Required<
    Pick<
      WsClientOptions,
      | 'reconnect'
      | 'reconnectDelayMs'
      | 'maxReconnectDelayMs'
      | 'maxReconnectAttempts'
      | 'socketFactory'
    >
  > &
    WsClientOptions;

  constructor(opts: WsClientOptions) {
    this.opts = {
      reconnect: true,
      reconnectDelayMs: 1_000,
      maxReconnectDelayMs: 15_000,
      maxReconnectAttempts: 6,
      socketFactory: (url: string) => new WebSocket(url),
      ...opts,
    };
  }

  private url(): string {
    const base = (this.opts.baseUrl ?? getBaseUrl()).replace(/^http/, 'ws');
    const token = encodeURIComponent(this.opts.participantToken);
    return `${base}/sessions/${this.opts.sessionId}/ws?participantToken=${token}`;
  }

  connect(): void {
    this.closedByUs = false;
    const ws = this.opts.socketFactory(this.url());
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.opts.onOpen?.();
    });

    ws.addEventListener('message', (ev: MessageEvent) => {
      let raw: unknown;
      try {
        raw = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }
      const msg = parseServerMessage(raw);
      if (msg) this.opts.onMessage(msg);
    });

    ws.addEventListener('close', () => {
      if (this.closedByUs || !this.opts.reconnect) {
        this.opts.onClose?.({ willReconnect: false });
        return;
      }
      if (this.reconnectAttempt >= this.opts.maxReconnectAttempts) {
        // Reconnections exhausted — give up with a clear "lost" signal.
        this.opts.onClose?.({ willReconnect: false });
        this.opts.onExhausted?.();
        return;
      }
      this.opts.onClose?.({ willReconnect: true });
      this.scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // 'close' will follow; reconnection is handled there.
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    const delay = Math.min(
      this.opts.reconnectDelayMs * 2 ** (this.reconnectAttempt - 1),
      this.opts.maxReconnectDelayMs,
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendGps(fix: Pick<GpsFix, 'lat' | 'lng' | 'accuracy' | 'bearing'>): void {
    this.send({
      type: 'gps',
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      bearing: fix.bearing,
    });
  }

  sendTier(tier: Tier): void {
    this.send({ type: 'tier', tier });
  }

  sendLeave(): void {
    this.send({ type: 'leave' });
  }

  sendMet(): void {
    this.send({ type: 'met' });
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Close intentionally and stop reconnecting. */
  close(): void {
    this.closedByUs = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
