import { create } from 'zustand';

import { getJSON, setJSON } from './storage';

const KEY = 'bp.contacts';

export interface Contact {
  id: string;
  label: string;
}

interface ContactsState {
  contacts: Contact[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (label: string) => Promise<void>;
  /** Test/seed helper — set contacts without persisting. */
  seed: (contacts: Contact[]) => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  hydrated: false,
  hydrate: async () => {
    const contacts = await getJSON<Contact[]>(KEY);
    set({ contacts: contacts ?? [], hydrated: true });
  },
  add: async (label) => {
    const next = [{ id: `c-${label}`, label }, ...get().contacts];
    set({ contacts: next });
    await setJSON(KEY, next);
  },
  seed: (contacts) => set({ contacts }),
}));
