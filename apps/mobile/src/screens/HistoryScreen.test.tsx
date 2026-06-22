import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useHistoryStore, type HistoryEntry } from '../local/historyStore';

import { HistoryScreen } from './HistoryScreen';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useHistoryStore.setState({ entries: [], hydrated: false });
});

async function seed(entries: HistoryEntry[]) {
  await AsyncStorage.setItem('bp.history', JSON.stringify(entries));
}

describe('HistoryScreen', () => {
  it('renders a clean empty state when there is nothing', async () => {
    const r = render(<HistoryScreen />);
    await waitFor(() => expect(useHistoryStore.getState().hydrated).toBe(true));
    expect(r.getByTestId('history-empty')).toBeTruthy();
    expect(r.getByText('Your meetups will show up here.')).toBeTruthy();
  });

  it('renders rich rows (name, duration, outcome badge), newest-first', async () => {
    const base = 1_700_000_000_000;
    await seed([
      // older first on purpose — the screen must sort newest-first
      { id: 'old', peerLabel: 'Alex', outcome: 'met', startedAt: base, endedAt: base + 12 * 60_000, durationMs: 12 * 60_000 },
      { id: 'new', peerLabel: 'Jordan', outcome: 'expired', startedAt: base, endedAt: base + 100 * 60_000, durationMs: 3 * 60_000 },
    ]);

    const r = render(<HistoryScreen />);
    await waitFor(() => expect(r.getAllByTestId('history-entry').length).toBe(2));

    // names + duration + badges
    expect(r.getByText('Alex')).toBeTruthy();
    expect(r.getByText('Jordan')).toBeTruthy();
    expect(r.getByText('Met')).toBeTruthy();
    expect(r.getByText('Expired')).toBeTruthy();
    expect(r.getAllByText(/min/).length).toBeGreaterThan(0); // duration shown

    // newest-first: Jordan (endedAt+100min) appears before Alex
    const rows = r.getAllByTestId('history-entry');
    expect(rows[0].textContent).toContain('Jordan');
    expect(rows[1].textContent).toContain('Alex');
  });

  it('renders every outcome badge', async () => {
    const base = 1_700_000_000_000;
    await seed([
      { id: 'm', peerLabel: 'A', outcome: 'met', endedAt: base + 4 },
      { id: 'a', peerLabel: 'B', outcome: 'abandoned', endedAt: base + 3 },
      { id: 'e', peerLabel: 'C', outcome: 'expired', endedAt: base + 2 },
      { id: 'l', peerLabel: 'D', outcome: 'lost', endedAt: base + 1 },
    ]);
    const r = render(<HistoryScreen />);
    await waitFor(() => expect(r.getAllByTestId('history-entry').length).toBe(4));
    expect(r.getByText('Met')).toBeTruthy();
    expect(r.getByText('Left')).toBeTruthy();
    expect(r.getByText('Expired')).toBeTruthy();
    expect(r.getByText('Lost')).toBeTruthy();
  });

  it('handles legacy / partial entries without crashing', async () => {
    await seed([
      // legacy 2.5 shape (reason/at, no outcome/endedAt/duration)
      { id: 'L1', peerLabel: 'OldPal', reason: 'met', at: 1_700_000_000_000 },
      // partial: no peerLabel, no outcome
      { id: 'L2', reason: 'abandoned', at: 1_700_000_100_000 },
      // almost-empty entry
      { id: 'L3' } as HistoryEntry,
    ]);

    const r = render(<HistoryScreen />);
    await waitFor(() => expect(r.getAllByTestId('history-entry').length).toBe(3));
    expect(r.getByText('OldPal')).toBeTruthy();
    expect(r.getAllByText('Someone').length).toBe(2); // L2 + L3 fall back
    // legacy reason mapped to a badge, no crash
    expect(r.getByText('Left')).toBeTruthy(); // abandoned
  });
});
