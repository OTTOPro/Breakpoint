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

describe('HistoryScreen', () => {
  it('renders a clean empty state when there is nothing', async () => {
    const r = render(<HistoryScreen />);
    await waitFor(() => expect(useHistoryStore.getState().hydrated).toBe(true));
    expect(r.getByTestId('history-empty')).toBeTruthy();
    expect(r.getByText('Your meetups will show up here.')).toBeTruthy();
  });

  it('renders seeded local entries', async () => {
    const seeded: HistoryEntry[] = [
      { id: 'm-1', peerLabel: 'Alex', reason: 'met', at: 1_700_000_000_000 },
      { id: 'm-2', reason: 'met', at: 1_700_000_100_000 },
    ];
    await AsyncStorage.setItem('bp.history', JSON.stringify(seeded));

    const r = render(<HistoryScreen />);
    await waitFor(() => expect(r.getAllByTestId('history-entry').length).toBe(2));
    expect(r.getByText('Alex')).toBeTruthy();
    expect(r.getByText('Someone')).toBeTruthy(); // entry with no peerLabel
  });
});
