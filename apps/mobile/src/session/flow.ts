import { getSessionLabel } from '../local/profileStore';

import { createSession, joinSession } from './api';
import { engine } from './engineInstance';
import { describeError } from './errors';
import { parseJoinUrl } from './joinLink';
import { useSessionStore } from './store';

/**
 * Session flow helpers — thin glue between the UI and the 2.3 engine. They own
 * the loading phase + error state so screens can show a spinner / error+retry
 * and never hang. Network is best-effort; failures surface as a clear error.
 */

export async function startAsInitiator(): Promise<boolean> {
  const store = useSessionStore.getState();
  store.setMyLabel(getSessionLabel());
  store.setError(undefined);
  store.setPhase('creating');
  try {
    const res = await createSession();
    store.setInvite({ joinCode: res.joinCode, joinUrl: res.joinUrl });
    await engine.start({
      sessionId: res.sessionId,
      participantToken: res.participantToken,
      role: 'initiator',
    });
    store.setPhase('idle');
    return true;
  } catch (err) {
    const { kind, message } = describeError(err);
    store.setError({ kind, message, phase: 'create' });
    store.setPhase('idle');
    return false;
  }
}

export async function startAsJoiner(
  sessionId: string,
  joinCapability: string,
): Promise<boolean> {
  const store = useSessionStore.getState();
  store.setMyLabel(getSessionLabel());
  store.setError(undefined);
  store.setPhase('joining');
  try {
    const res = await joinSession(sessionId, joinCapability);
    await engine.start({
      sessionId: res.sessionId,
      participantToken: res.participantToken,
      role: 'joiner',
    });
    store.setPhase('idle');
    return true;
  } catch (err) {
    const { kind, message } = describeError(err);
    store.setError({ kind, message, phase: 'join' });
    store.setPhase('idle');
    return false;
  }
}

/** Join from a pasted/deep link (capability read from the URL fragment). */
export async function startAsJoinerFromLink(url: string): Promise<boolean> {
  const link = parseJoinUrl(url);
  if (!link) {
    useSessionStore.getState().setError({
      kind: 'invalid_code',
      message: "That link doesn't look right. Ask for a fresh invite.",
      phase: 'join',
    });
    return false;
  }
  return startAsJoiner(link.sessionId, link.capability);
}

export function confirmMet(): void {
  engine.confirmMet();
}

export function leaveSession(): void {
  engine.stop();
  useSessionStore.getState().reset();
}
