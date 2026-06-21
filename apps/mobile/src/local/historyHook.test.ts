import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';

import { recordEndedMeetup, useHistoryStore } from './historyStore';

beforeEach(async () => {
  await AsyncStorage.clear?.();
  useHistoryStore.setState({ entries: [], hydrated: true });
});

describe('engine history hook — on ended/met', () => {
  it('writes one local history entry and persists it', async () => {
    // This is exactly what the engine calls on an `ended` WS message.
    await recordEndedMeetup({ reason: 'met', at: 1_700_000_200_000, peerLabel: 'Sam' });

    const entries = useHistoryStore.getState().entries;
    expect(entries.length).toBe(1);
    expect(entries[0]).toMatchObject({ reason: 'met', peerLabel: 'Sam', at: 1_700_000_200_000 });

    const raw = await AsyncStorage.getItem('bp.history');
    expect(raw).toContain('met');
  });

  it('prepends newer meetups', async () => {
    await recordEndedMeetup({ reason: 'met', at: 1_000 });
    await recordEndedMeetup({ reason: 'met', at: 2_000 });
    const entries = useHistoryStore.getState().entries;
    expect(entries[0]!.at).toBe(2_000);
    expect(entries[1]!.at).toBe(1_000);
  });
});
