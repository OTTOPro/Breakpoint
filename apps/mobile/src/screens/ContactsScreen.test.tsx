import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useContactsStore, type Contact } from '../local/contactsStore';

import { ContactsScreen } from './ContactsScreen';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useContactsStore.setState({ contacts: [], hydrated: false });
});

describe('ContactsScreen', () => {
  it('renders a clean empty state when there are no contacts', async () => {
    const r = render(<ContactsScreen />);
    await waitFor(() => expect(useContactsStore.getState().hydrated).toBe(true));
    expect(r.getByTestId('contacts-empty')).toBeTruthy();
    expect(r.getByText('No saved contacts yet.')).toBeTruthy();
  });

  it('renders seeded local labels', async () => {
    const seeded: Contact[] = [
      { id: 'c-Alex', label: 'Alex' },
      { id: 'c-Jo', label: 'Jo' },
    ];
    await AsyncStorage.setItem('bp.contacts', JSON.stringify(seeded));

    const r = render(<ContactsScreen />);
    await waitFor(() => expect(r.getAllByTestId('contacts-item').length).toBe(2));
    expect(r.getByText('Alex')).toBeTruthy();
    expect(r.getByText('Jo')).toBeTruthy();
  });
});
