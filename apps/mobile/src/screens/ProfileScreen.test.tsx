import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Avoid pulling expo-location (native-only) into jsdom; perms aren't tested here.
vi.mock('../proximity/permissions', () => ({
  requestProximityPermissions: async () => true,
}));

import { getSessionLabel, useProfileStore } from '../local/profileStore';

import { ProfileScreen } from './ProfileScreen';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useProfileStore.setState({ name: '', hydrated: false });
});

describe('ProfileScreen — display name persistence', () => {
  it('edits the name, persists it, and re-reads it after a remount', async () => {
    const r = render(<ProfileScreen />);
    const input = r.getByTestId('profile-name-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Othmane' } });
    fireEvent.click(r.getByTestId('profile-save'));

    await waitFor(() => expect(useProfileStore.getState().name).toBe('Othmane'));

    // The name feeds the session label.
    expect(getSessionLabel()).toBe('Othmane');

    // Simulate a remount with a fresh in-memory store (persisted value remains).
    cleanup();
    useProfileStore.setState({ name: '', hydrated: false });

    const r2 = render(<ProfileScreen />);
    await waitFor(() =>
      expect((r2.getByTestId('profile-name-input') as HTMLInputElement).value).toBe('Othmane'),
    );
  });

  it('falls back to "You" as the session label when unset', () => {
    expect(getSessionLabel()).toBe('You');
  });
});
