import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SessionState } from '@breakpoint/protocol';

import {
  outcomeFromEndedReason,
  outcomeFromState,
  recordTerminal,
  useHistoryStore,
  type HistoryOutcome,
} from './historyStore';

beforeEach(async () => {
  await AsyncStorage.clear?.();
  useHistoryStore.setState({ entries: [], hydrated: true });
});

describe('terminal-outcome mapping (every terminal path → right outcome)', () => {
  it('maps DO ended reasons', () => {
    const cases: [string, HistoryOutcome][] = [
      ['met', 'met'],
      ['abandoned', 'abandoned'],
      ['cancelled', 'abandoned'],
      ['join_ttl', 'expired'],
      ['max_lifetime', 'expired'],
      ['lost', 'lost'],
    ];
    for (const [reason, expected] of cases) {
      expect(outcomeFromEndedReason(reason)).toBe(expected);
    }
  });

  it('maps DO terminal states, ignoring non-terminal ones', () => {
    expect(outcomeFromState('ended')).toBe('met');
    expect(outcomeFromState('abandoned')).toBe('abandoned');
    expect(outcomeFromState('expired')).toBe('expired');
    expect(outcomeFromState('cancelled')).toBe('abandoned');
    for (const s of [
      'created',
      'active_gps',
      'active_ble',
      'social_handoff',
    ] as SessionState[]) {
      expect(outcomeFromState(s)).toBeNull();
    }
  });
});

describe('engine history hook — records a rich entry on each terminal outcome', () => {
  it.each(['met', 'abandoned', 'expired', 'lost'] as HistoryOutcome[])(
    'records outcome=%s with peerLabel, startedAt, endedAt, durationMs',
    async (outcome) => {
      const startedAt = 1_700_000_000_000;
      const endedAt = startedAt + 12 * 60_000; // 12 min
      await recordTerminal({ outcome, peerLabel: 'Sam', startedAt, endedAt });

      const [entry] = useHistoryStore.getState().entries;
      expect(entry).toMatchObject({
        outcome,
        peerLabel: 'Sam',
        startedAt,
        endedAt,
        durationMs: 12 * 60_000,
      });
      const raw = await AsyncStorage.getItem('bp.history');
      expect(raw).toContain(outcome);
    },
  );

  it('omits durationMs when startedAt is unknown (degrades cleanly)', async () => {
    await recordTerminal({ outcome: 'expired', endedAt: 2_000 });
    const [entry] = useHistoryStore.getState().entries;
    expect(entry!.durationMs).toBeUndefined();
    expect(entry!.peerLabel).toBeUndefined(); // no peer label invented
  });

  it('prepends newer meetups (newest-first in storage)', async () => {
    await recordTerminal({ outcome: 'met', endedAt: 1_000 });
    await recordTerminal({ outcome: 'abandoned', endedAt: 2_000 });
    const entries = useHistoryStore.getState().entries;
    expect(entries[0]!.endedAt).toBe(2_000);
    expect(entries[1]!.endedAt).toBe(1_000);
  });

  it('does NOT clobber persisted history when the store is unhydrated', async () => {
    // Simulate prior history on disk, but an empty in-memory store (the engine
    // records from a screen that never hydrated the history store).
    await AsyncStorage.setItem(
      'bp.history',
      JSON.stringify([{ id: 'old', outcome: 'met', endedAt: 500 }]),
    );
    useHistoryStore.setState({ entries: [], hydrated: false });

    await recordTerminal({ outcome: 'abandoned', endedAt: 9_000 });

    const raw = JSON.parse((await AsyncStorage.getItem('bp.history'))!);
    expect(raw).toHaveLength(2); // old entry preserved + new one
    expect(raw[0].endedAt).toBe(9_000); // newest first
    expect(raw[1].id).toBe('old');
  });
});
