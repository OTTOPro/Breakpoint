import { create } from 'zustand';

import { getJSON, setJSON } from './storage';

const KEY = 'bp.history';

export interface HistoryEntry {
  id: string;
  /** Peer's label if we have one locally (no peer identity in the protocol). */
  peerLabel?: string;
  /** Why the session closed, e.g. "met". */
  reason: string;
  /** epoch millis. */
  at: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (entry: HistoryEntry) => Promise<void>;
  /** Test/seed helper — set entries without persisting. */
  seed: (entries: HistoryEntry[]) => void;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  hydrated: false,
  hydrate: async () => {
    const entries = await getJSON<HistoryEntry[]>(KEY);
    set({ entries: entries ?? [], hydrated: true });
  },
  add: async (entry) => {
    const next = [entry, ...get().entries];
    set({ entries: next });
    await setJSON(KEY, next);
  },
  seed: (entries) => set({ entries }),
  clear: async () => {
    set({ entries: [] });
    await setJSON(KEY, []);
  },
}));

/**
 * The single, tiny engine hook: on an `ended`/`met` transition, write one local
 * history entry. Nothing else.
 */
export async function recordEndedMeetup(input: {
  reason: string;
  peerLabel?: string;
  at: number;
}): Promise<void> {
  await useHistoryStore.getState().add({
    id: `m-${input.at}`,
    peerLabel: input.peerLabel,
    reason: input.reason,
    at: input.at,
  });
}
