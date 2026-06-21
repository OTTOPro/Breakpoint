import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the native engine and the HTTP client so we exercise flow logic only.
vi.mock('./engineInstance', () => ({
  engine: { start: vi.fn(async () => {}), confirmMet: vi.fn(), stop: vi.fn() },
}));
vi.mock('./api', () => ({
  createSession: vi.fn(),
  joinSession: vi.fn(),
}));

import { createSession, joinSession } from './api';
import { engine } from './engineInstance';
import { ApiError, networkError } from './errors';
import { startAsInitiator, startAsJoiner } from './flow';
import { useSessionStore } from './store';

const created = {
  sessionId: 's1',
  joinCode: 'K7P2QX',
  joinUrl: 'https://breakpoint.app/j?sid=s1#cap=abc',
  participantToken: 'tok',
};

beforeEach(() => {
  useSessionStore.getState().reset();
  vi.clearAllMocks();
});
afterEach(() => vi.clearAllMocks());

describe('startAsInitiator — failure paths never hang', () => {
  it('backend unreachable on create → error + retry, phase back to idle', async () => {
    vi.mocked(createSession).mockRejectedValue(networkError());
    const ok = await startAsInitiator();
    expect(ok).toBe(false);
    const s = useSessionStore.getState();
    expect(s.phase).toBe('idle'); // no infinite spinner
    expect(s.error).toMatchObject({ phase: 'create', kind: 'network' });
    expect(s.error!.message.length).toBeGreaterThan(0);
  });

  it('shows a loading phase while in flight, then idle on success', async () => {
    let resolve!: (v: typeof created) => void;
    vi.mocked(createSession).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const promise = startAsInitiator();
    expect(useSessionStore.getState().phase).toBe('creating'); // pending visible
    resolve(created);
    expect(await promise).toBe(true);
    expect(useSessionStore.getState().phase).toBe('idle');
    expect(engine.start).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().error).toBeUndefined();
  });
});

describe('startAsJoiner — maps backend errors to clear messages', () => {
  it.each([
    [403, 'invalid_code'],
    [404, 'not_found'],
    [409, 'full'],
    [410, 'expired'],
  ] as const)('HTTP %s → error kind %s', async (status, kind) => {
    vi.mocked(joinSession).mockRejectedValue(new ApiError(kind, status, `msg ${status}`));
    const ok = await startAsJoiner('s1', 'cap');
    expect(ok).toBe(false);
    const s = useSessionStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.error).toMatchObject({ phase: 'join', kind });
  });

  it('success starts the engine and clears error', async () => {
    vi.mocked(joinSession).mockResolvedValue({ sessionId: 's1', participantToken: 'jtok' });
    const ok = await startAsJoiner('s1', 'cap');
    expect(ok).toBe(true);
    expect(engine.start).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().error).toBeUndefined();
  });
});
