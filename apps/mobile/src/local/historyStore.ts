import type { SessionState } from '@breakpoint/protocol';
import { create } from 'zustand';

import { getJSON, setJSON } from './storage';

const KEY = 'bp.history';

/** How a meetup ended — derived from the DO's real terminal state. */
export type HistoryOutcome = 'met' | 'abandoned' | 'expired' | 'lost';

/**
 * A local history entry. Rich fields are canonical; the legacy 2.5 fields
 * (`reason`, `at`) are kept optional so old/partial entries still load.
 */
export interface HistoryEntry {
  id: string;
  peerLabel?: string;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  outcome?: HistoryOutcome;
  // legacy (2.5) shape
  reason?: string;
  at?: number;
}

/** Entry with every field resolved (fallbacks applied) — safe for the UI. */
export interface NormalizedEntry {
  id: string;
  peerLabel: string;
  startedAt?: number;
  endedAt: number;
  durationMs?: number;
  outcome: HistoryOutcome;
}

/** Map a DO `ended` reason to an outcome category. */
export function outcomeFromEndedReason(reason: string): HistoryOutcome {
  switch (reason) {
    case 'met':
      return 'met';
    case 'abandoned':
    case 'cancelled':
      return 'abandoned';
    case 'join_ttl':
    case 'max_lifetime':
    case 'expired':
      return 'expired';
    case 'lost':
    case 'failed':
      return 'lost';
    default:
      return 'abandoned';
  }
}

/** Map a DO terminal state to an outcome, or null if the state isn't terminal. */
export function outcomeFromState(state: SessionState): HistoryOutcome | null {
  switch (state) {
    case 'ended':
      return 'met';
    case 'abandoned':
      return 'abandoned';
    case 'expired':
      return 'expired';
    case 'cancelled':
      return 'abandoned';
    default:
      return null; // created / active_* are not terminal
  }
}

/** Resolve fallbacks so the rich UI never crashes on legacy/partial data. */
export function normalizeEntry(e: HistoryEntry): NormalizedEntry {
  const endedAt = e.endedAt ?? e.at ?? 0;
  const outcome =
    e.outcome ?? (e.reason ? outcomeFromEndedReason(e.reason) : 'met');
  const durationMs =
    e.durationMs ??
    (e.startedAt != null && endedAt
      ? Math.max(0, endedAt - e.startedAt)
      : undefined);
  return {
    id: e.id,
    peerLabel: e.peerLabel ?? 'Someone',
    startedAt: e.startedAt,
    endedAt,
    durationMs,
    outcome,
  };
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
    // Read the persisted list (source of truth) so a write from a screen that
    // hasn't hydrated the store (e.g. the engine on the Finding screen) never
    // clobbers existing history.
    const existing = (await getJSON<HistoryEntry[]>(KEY)) ?? get().entries;
    const next = [entry, ...existing];
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
 * The engine's terminal hook: write ONE rich history entry when a session
 * reaches a terminal state. Called for every terminal path (met/abandoned/
 * expired/lost) — see SessionEngine.
 */
export async function recordTerminal(input: {
  outcome: HistoryOutcome;
  peerLabel?: string;
  startedAt?: number;
  endedAt: number;
}): Promise<void> {
  const durationMs =
    input.startedAt != null
      ? Math.max(0, input.endedAt - input.startedAt)
      : undefined;
  await useHistoryStore.getState().add({
    id: `m-${input.endedAt}`,
    peerLabel: input.peerLabel,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMs,
    outcome: input.outcome,
  });
}
