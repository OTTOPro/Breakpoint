import { describe, it, expect, beforeEach } from 'vitest';

import { useSessionStore } from './store';

const apply = useSessionStore.getState().applyServerMessage;

beforeEach(() => {
  useSessionStore.getState().reset();
});

describe('session store — server message handling', () => {
  it("'session' delivers bleUuid + state + peerPresent and opens the connection", () => {
    useSessionStore
      .getState()
      .applyServerMessage({
        type: 'session',
        bleUuid: '5b8259ea-e9d9-7e1f-dafd-19d5fb36cd25',
        peerPresent: false,
        state: 'active_gps',
      });

    const s = useSessionStore.getState();
    expect(s.bleUuid).toBe('5b8259ea-e9d9-7e1f-dafd-19d5fb36cd25');
    expect(s.state).toBe('active_gps');
    expect(s.peerPresent).toBe(false);
    expect(s.connection).toBe('open');
  });

  it("'peerJoined' marks the peer present", () => {
    apply({ type: 'peerJoined' });
    expect(useSessionStore.getState().peerPresent).toBe(true);
  });

  it("'peerGps' stores the peer's fix", () => {
    apply({
      type: 'peerGps',
      lat: 45.5019,
      lng: -73.5674,
      accuracy: 8,
      bearing: 120,
      at: 1700,
    });
    expect(useSessionStore.getState().peerGps).toEqual({
      lat: 45.5019,
      lng: -73.5674,
      accuracy: 8,
      bearing: 120,
      at: 1700,
    });
  });

  it("'peerTier' stores the peer's reported tier", () => {
    apply({ type: 'peerTier', tier: 'very_close' });
    expect(useSessionStore.getState().peerTier).toBe('very_close');
  });

  it("'state' advances the authoritative session state", () => {
    apply({ type: 'state', state: 'social_handoff' });
    expect(useSessionStore.getState().state).toBe('social_handoff');
  });

  it("'peerLeft' clears peer presence", () => {
    apply({ type: 'peerJoined' });
    apply({ type: 'peerLeft' });
    expect(useSessionStore.getState().peerPresent).toBe(false);
  });

  it("'ended' records the reason and closes the connection", () => {
    apply({ type: 'ended', reason: 'met' });
    const s = useSessionStore.getState();
    expect(s.endedReason).toBe('met');
    expect(s.connection).toBe('closed');
  });

  it('local setters update myGps / proximity / tier', () => {
    const st = useSessionStore.getState();
    st.setMyGps({ lat: 1, lng: 2, accuracy: 5, at: 100 });
    st.setProximity({ zone: 'close', trend: 'warming', rssiSmoothed: -70 });
    st.setTier('very_close');

    const s = useSessionStore.getState();
    expect(s.myGps).toEqual({ lat: 1, lng: 2, accuracy: 5, at: 100 });
    expect(s.proximity).toEqual({ zone: 'close', trend: 'warming', rssiSmoothed: -70 });
    expect(s.tier).toBe('very_close');
  });
});
