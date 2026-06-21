import { describe, expect, it, vi } from 'vitest';

import { SessionWsClient } from './wsClient';

type Handler = (ev?: unknown) => void;

/** A WebSocket stand-in that never connects — it closes right after open. */
class FakeSocket {
  readyState = 0;
  private listeners: Record<string, Handler[]> = {};
  addEventListener(type: string, cb: Handler) {
    (this.listeners[type] ??= []).push(cb);
  }
  emit(type: string) {
    (this.listeners[type] ?? []).forEach((cb) => cb());
  }
  send() {}
  close() {}
}

function failingFactory() {
  const sockets: FakeSocket[] = [];
  const factory = (_url: string) => {
    const s = new FakeSocket();
    sockets.push(s);
    // Close shortly after, once the client has attached its listeners.
    setTimeout(() => s.emit('close'), 0);
    return s as unknown as WebSocket;
  };
  return { factory, sockets };
}

const until = async (pred: () => boolean, timeout = 2000) => {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeout) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('SessionWsClient — reconnection exhaustion', () => {
  it('gives up after maxReconnectAttempts and signals exhaustion once (no hang)', async () => {
    const { factory, sockets } = failingFactory();
    const onExhausted = vi.fn();
    const closes: boolean[] = [];

    const client = new SessionWsClient({
      sessionId: 's',
      participantToken: 't',
      baseUrl: 'http://x',
      onMessage: () => {},
      onClose: (info) => closes.push(info.willReconnect),
      onExhausted,
      reconnectDelayMs: 1,
      maxReconnectDelayMs: 1,
      maxReconnectAttempts: 3,
      socketFactory: factory,
    });

    client.connect();
    await until(() => onExhausted.mock.calls.length === 1);

    // Bounded: initial attempt + 3 reconnects, then it stops (no infinite loop).
    expect(sockets.length).toBe(4);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    // Last close was terminal (willReconnect=false) → clear "lost" state.
    expect(closes[closes.length - 1]).toBe(false);
    expect(closes.filter((w) => w).length).toBe(3);

    // No further reconnects after exhaustion.
    await new Promise((r) => setTimeout(r, 30));
    expect(sockets.length).toBe(4);
  });
});
