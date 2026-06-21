import { createSession, joinSession } from './api';
import { engine } from './engineInstance';
import { useSessionStore } from './store';

/**
 * Session flow helpers — thin glue between the UI and the 2.3 engine. Screens
 * call these; they never invent state, and never fetch the bleUuid (that
 * arrives via the WS `session` frame, handled inside the engine/store).
 *
 * All network is best-effort: navigation never blocks on it, so the flow stays
 * walkable on web even without a backend running.
 */

export async function startAsInitiator(): Promise<boolean> {
  try {
    const res = await createSession();
    useSessionStore
      .getState()
      .setInvite({ joinCode: res.joinCode, joinUrl: res.joinUrl });
    await engine.start({
      sessionId: res.sessionId,
      participantToken: res.participantToken,
      role: 'initiator',
    });
    return true;
  } catch {
    return false;
  }
}

export async function startAsJoiner(
  sessionId: string,
  joinCapability: string,
): Promise<boolean> {
  try {
    const res = await joinSession(sessionId, joinCapability);
    await engine.start({
      sessionId: res.sessionId,
      participantToken: res.participantToken,
      role: 'joiner',
    });
    return true;
  } catch {
    return false;
  }
}

export function confirmMet(): void {
  engine.confirmMet();
}

export function leaveSession(): void {
  engine.stop();
  useSessionStore.getState().reset();
}
