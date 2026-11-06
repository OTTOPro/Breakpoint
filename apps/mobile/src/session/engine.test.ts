import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerMessage } from '@breakpoint/protocol';

import {
  onProximityError,
  startProximity,
  stopProximity,
  type ProximityErrorEvent,
} from '../../modules/breakpoint-ble';
import { watchGps } from '../location/gps';
import { requestProximityPermissions } from '../proximity/permissions';

import { SessionEngine, radioIssueFor } from './engine';
import { useSessionStore } from './store';

// Captures the onMessage handler the engine hands to the WS client, so a test
// can deliver the `session` frame whenever it wants.
const ws = vi.hoisted(() => ({
  onMessage: undefined as undefined | ((msg: unknown) => void),
}));

vi.mock('./wsClient', () => ({
  SessionWsClient: class {
    constructor(opts: { onMessage: (msg: unknown) => void }) {
      ws.onMessage = opts.onMessage;
    }
    connect() {}
    close() {}
    sendTier() {}
    sendGps() {}
    sendMet() {}
  },
}));
vi.mock('../../modules/breakpoint-ble', () => ({
  startProximity: vi.fn(),
  stopProximity: vi.fn(),
  onPeerSignal: vi.fn(() => ({ remove: vi.fn() })),
  onProximityError: vi.fn(() => ({ remove: vi.fn() })),
}));
vi.mock('../proximity/permissions', () => ({
  requestProximityPermissions: vi.fn(),
}));
vi.mock('../location/gps', () => ({
  watchGps: vi.fn(async () => ({ remove: vi.fn() })),
}));
vi.mock('../local/historyStore', () => ({
  recordTerminal: vi.fn(async () => {}),
  outcomeFromEndedReason: vi.fn(() => 'met'),
  outcomeFromState: vi.fn(() => undefined),
}));

const BLE_UUID = '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0';
const SESSION_FRAME = {
  type: 'session',
  bleUuid: BLE_UUID,
  peerPresent: false,
  state: 'active_gps',
} as ServerMessage;

/** A permission prompt the test answers by hand. */
function pendingPermission() {
  let answer!: (granted: boolean) => void;
  vi.mocked(requestProximityPermissions).mockReturnValue(
    new Promise<boolean>((resolve) => {
      answer = resolve;
    }),
  );
  return (granted: boolean) => answer(granted);
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useSessionStore.getState().reset();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('SessionEngine: Bluetooth waits for permission', () => {
  it('does not start the radio while the permission prompt is open', async () => {
    const answer = pendingPermission();
    const engine = new SessionEngine();
    void engine.start({ sessionId: 's1', participantToken: 't', role: 'initiator' });

    ws.onMessage!(SESSION_FRAME); // the socket can be faster than the user
    await flush();
    expect(startProximity).not.toHaveBeenCalled();

    answer(true);
    await flush();
    expect(startProximity).toHaveBeenCalledWith(BLE_UUID);
    engine.stop();
  });

  it('never starts the radio when permission is denied, and says so', async () => {
    const answer = pendingPermission();
    const engine = new SessionEngine();
    void engine.start({ sessionId: 's1', participantToken: 't', role: 'initiator' });
    ws.onMessage!(SESSION_FRAME);

    answer(false);
    await flush();
    expect(startProximity).not.toHaveBeenCalled();
    expect(watchGps).not.toHaveBeenCalled();
    expect(useSessionStore.getState().radioIssue).toBe('permission_denied');
    engine.stop();
  });

  it('starts nothing if the user leaves before answering', async () => {
    const answer = pendingPermission();
    const engine = new SessionEngine();
    void engine.start({ sessionId: 's1', participantToken: 't', role: 'initiator' });
    ws.onMessage!(SESSION_FRAME);

    engine.stop();
    answer(true);
    await flush();
    expect(startProximity).not.toHaveBeenCalled();
    expect(watchGps).not.toHaveBeenCalled();
    expect(stopProximity).toHaveBeenCalled();
  });
});

describe('SessionEngine: native failures reach the screen', () => {
  it('turns a Bluetooth-off event into a visible radio issue', async () => {
    const answer = pendingPermission();
    const engine = new SessionEngine();
    void engine.start({ sessionId: 's1', participantToken: 't', role: 'initiator' });
    ws.onMessage!(SESSION_FRAME);
    answer(true);
    await flush();

    const listener = vi.mocked(onProximityError).mock.calls[0]![0] as (
      e: ProximityErrorEvent,
    ) => void;
    listener({ code: 'bluetooth_off' });
    expect(useSessionStore.getState().radioIssue).toBe('bluetooth_off');
    engine.stop();
  });

  it('maps every native code to a screen state', () => {
    expect(radioIssueFor('unauthorized')).toBe('permission_denied');
    expect(radioIssueFor('unsupported')).toBe('unsupported');
    expect(radioIssueFor('advertise_failed')).toBe('failed');
    expect(radioIssueFor('scan_failed')).toBe('failed');
  });
});
