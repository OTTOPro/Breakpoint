import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHistoryStore, type HistoryEntry } from '../local/historyStore';
import { useProfileStore } from '../local/profileStore';

import { HomeScreen } from './HomeScreen';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useProfileStore.setState({ name: '', onboardingComplete: false, hydrated: false });
  useHistoryStore.setState({ entries: [], hydrated: false });
});

describe('HomeScreen — dynamic greeting', () => {
  it('greets with the profile name', async () => {
    await AsyncStorage.setItem('bp.profile.name', JSON.stringify('Othmane'));
    const r = render(<HomeScreen />);
    await waitFor(() =>
      expect(r.getByTestId('home-greeting').textContent).toBe('Othmane'),
    );
  });

  it('falls back to a neutral greeting when no name is set', async () => {
    const r = render(<HomeScreen />);
    await waitFor(() => expect(useProfileStore.getState().hydrated).toBe(true));
    expect(r.getByTestId('home-greeting').textContent).toBe('there');
  });
});

describe('HomeScreen — recents preview', () => {
  const base = 1_700_000_000_000;
  const seeded: HistoryEntry[] = [
    { id: 'r1', peerLabel: 'Alex', outcome: 'met', endedAt: base + 1, durationMs: 12 * 60_000 },
    { id: 'r2', peerLabel: 'Jordan', outcome: 'expired', endedAt: base + 4, durationMs: 3 * 60_000 },
    { id: 'r3', peerLabel: 'Pat', outcome: 'abandoned', endedAt: base + 3 },
    { id: 'r4', peerLabel: 'Sam', outcome: 'lost', endedAt: base + 2 },
  ];

  it('shows the top 3 recents, newest-first, reusing the rich row', async () => {
    await AsyncStorage.setItem('bp.history', JSON.stringify(seeded));
    const r = render(<HomeScreen />);
    await waitFor(() => expect(r.getAllByTestId('home-recent').length).toBe(3));

    const rows = r.getAllByTestId('home-recent');
    expect(rows[0].textContent).toContain('Jordan'); // newest (base+4)
    expect(rows[1].textContent).toContain('Pat'); // base+3
    expect(rows[2].textContent).toContain('Sam'); // base+2
    // rich row content (badge + duration) reused from 2.9
    expect(r.getByText('Expired')).toBeTruthy();
    expect(r.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('renders an empty state when there are no meetups', async () => {
    const r = render(<HomeScreen />);
    await waitFor(() => expect(useHistoryStore.getState().hydrated).toBe(true));
    expect(r.getByTestId('home-recents-empty')).toBeTruthy();
    expect(r.queryAllByTestId('home-recent').length).toBe(0);
  });
});

describe('HomeScreen — actions route', () => {
  it('Find / Join / recents trigger their handlers', async () => {
    await AsyncStorage.setItem(
      'bp.history',
      JSON.stringify([{ id: 'r1', peerLabel: 'Alex', outcome: 'met', endedAt: 1 }]),
    );
    const onFind = vi.fn();
    const onJoin = vi.fn();
    const onRecents = vi.fn();
    const r = render(<HomeScreen onFind={onFind} onJoin={onJoin} onRecents={onRecents} />);
    await waitFor(() => expect(r.getAllByTestId('home-recent').length).toBe(1));

    fireEvent.click(r.getByTestId('home-find'));
    expect(onFind).toHaveBeenCalledOnce();
    fireEvent.click(r.getByTestId('home-join'));
    expect(onJoin).toHaveBeenCalledOnce();
    fireEvent.click(r.getByTestId('home-recent'));
    fireEvent.click(r.getByTestId('home-recents-all'));
    expect(onRecents).toHaveBeenCalledTimes(2);
  });
});

describe('HomeScreen — loading & error states (2.7)', () => {
  it('shows a loading state and blocks double-submit while pending', () => {
    const onFind = vi.fn();
    const r = render(<HomeScreen onFind={onFind} pending />);
    expect(r.getByTestId('home-pending')).toBeTruthy();
    expect(r.getByText('Starting…')).toBeTruthy();
    fireEvent.click(r.getByTestId('home-find'));
    expect(onFind).not.toHaveBeenCalled();
  });

  it('renders an error banner with a retry affordance', () => {
    const onFind = vi.fn();
    const r = render(<HomeScreen onFind={onFind} errorMessage="Can't reach BreakPoint." />);
    expect(r.getByTestId('home-error')).toBeTruthy();
    fireEvent.click(r.getByTestId('home-error'));
    expect(onFind).toHaveBeenCalledOnce();
  });
});

describe('HomeScreen — accessibility', () => {
  it('labels the primary actions for screen readers', () => {
    const r = render(<HomeScreen />);
    expect(r.getByTestId('home-find').getAttribute('aria-label')).toMatch(/Find someone/);
    expect(r.getByTestId('home-find').getAttribute('role')).toBe('button');
    expect(r.getByTestId('home-join').getAttribute('aria-label')).toMatch(/Join with a code/);
  });
});
