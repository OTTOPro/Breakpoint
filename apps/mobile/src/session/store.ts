import type {
  GpsFix,
  ServerMessage,
  SessionState,
  Tier,
} from '@breakpoint/protocol';
import { create } from 'zustand';

import type { ProximityReading } from '../proximity/smoothing';
import type { ErrorKind } from './errors';

/** In-flight network phase for create/join (loading states). */
export type SessionPhase = 'idle' | 'creating' | 'joining';

export interface AppError {
  kind: ErrorKind;
  message: string;
  /** Which action failed, so the UI can offer the right retry. */
  phase: 'create' | 'join' | 'ws';
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed';

export type ParticipantRole = 'initiator' | 'joiner';

export interface SessionStoreState {
  sessionId?: string;
  role?: ParticipantRole;
  participantToken?: string;
  /** Authoritative session state from the DO. */
  state?: SessionState;
  /** Delivered ONLY via the WS `session` message (never fetched elsewhere). */
  bleUuid?: string;
  peerPresent: boolean;

  /** Local display label (from Profile) used for this session. */
  myLabel?: string;

  /** From createSession — shown on the Invite screen. Never the bleUuid. */
  joinCode?: string;
  joinUrl?: string;

  myGps?: GpsFix;
  peerGps?: GpsFix;

  /** Local smoothed proximity. */
  proximity: ProximityReading | null;
  /** Displayed tier (from the orchestrator). */
  tier: Tier;
  /** Peer's reported tier (relayed by the DO). */
  peerTier?: Tier;

  connection: ConnectionState;
  endedReason?: string;

  /** Loading state for create/join. */
  phase: SessionPhase;
  /** Last surfaced error (cleared on retry). */
  error?: AppError;

  // actions
  setSession: (info: {
    sessionId: string;
    role: ParticipantRole;
    participantToken: string;
  }) => void;
  setInvite: (info: { joinCode: string; joinUrl: string }) => void;
  setMyLabel: (label: string) => void;
  setPhase: (phase: SessionPhase) => void;
  setError: (error: AppError | undefined) => void;
  applyServerMessage: (msg: ServerMessage) => void;
  setMyGps: (gps: GpsFix) => void;
  setProximity: (proximity: ProximityReading) => void;
  setTier: (tier: Tier) => void;
  setConnection: (connection: ConnectionState) => void;
  reset: () => void;
}

const INITIAL = {
  sessionId: undefined,
  role: undefined,
  participantToken: undefined,
  state: undefined,
  bleUuid: undefined,
  peerPresent: false,
  myLabel: undefined,
  joinCode: undefined,
  joinUrl: undefined,
  myGps: undefined,
  peerGps: undefined,
  proximity: null,
  tier: 'far' as Tier,
  peerTier: undefined,
  connection: 'idle' as ConnectionState,
  endedReason: undefined,
  phase: 'idle' as SessionPhase,
  error: undefined as AppError | undefined,
};

export const useSessionStore = create<SessionStoreState>((set) => ({
  ...INITIAL,

  setSession: ({ sessionId, role, participantToken }) =>
    set({ sessionId, role, participantToken }),

  setInvite: ({ joinCode, joinUrl }) => set({ joinCode, joinUrl }),

  setMyLabel: (myLabel) => set({ myLabel }),

  setPhase: (phase) => set({ phase }),

  setError: (error) => set({ error }),

  applyServerMessage: (msg) =>
    set((prev) => {
      switch (msg.type) {
        case 'session':
          return {
            bleUuid: msg.bleUuid,
            state: msg.state,
            peerPresent: msg.peerPresent,
            connection: 'open',
          };
        case 'peerJoined':
          return { peerPresent: true };
        case 'peerGps':
          return {
            peerGps: {
              lat: msg.lat,
              lng: msg.lng,
              accuracy: msg.accuracy,
              bearing: msg.bearing,
              at: msg.at,
            },
          };
        case 'peerTier':
          return { peerTier: msg.tier };
        case 'state':
          return { state: msg.state };
        case 'peerLeft':
          return { peerPresent: false };
        case 'ended':
          return {
            endedReason: msg.reason,
            connection: 'closed',
          };
        default: {
          // Exhaustiveness guard.
          const _never: never = msg;
          return prev;
        }
      }
    }),

  setMyGps: (gps) => set({ myGps: gps }),
  setProximity: (proximity) => set({ proximity }),
  setTier: (tier) => set({ tier }),
  setConnection: (connection) => set({ connection }),
  reset: () => set({ ...INITIAL }),
}));
