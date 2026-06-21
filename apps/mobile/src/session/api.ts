/**
 * Control-plane HTTP client: create / join a session against the backend
 * Worker. Base URL is configurable (defaults to the local `wrangler dev`).
 * Failures throw a typed {@link ApiError} so the UI can show a clear state.
 */
import { mapCreateStatus, mapJoinStatus, networkError } from './errors';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

let baseUrl =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL) ||
  DEFAULT_BASE_URL;

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/$/, '');
}

export function getBaseUrl(): string {
  return baseUrl;
}

export interface CreateSessionResult {
  sessionId: string;
  joinCode: string;
  joinUrl: string;
  /** Initiator's participant token. */
  participantToken: string;
}

export interface JoinSessionResult {
  sessionId: string;
  /** Joiner's participant token. */
  participantToken: string;
}

/** Optional test/tuning overrides forwarded to the DO. */
export interface CreateSessionOptions {
  joinTtlMs?: number;
  maxLifetimeMs?: number;
  graceMs?: number;
}

export async function createSession(
  opts: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(opts),
    });
  } catch {
    throw networkError();
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw mapCreateStatus(res.status, body.error);
  }
  return (await res.json()) as CreateSessionResult;
}

export async function joinSession(
  sessionId: string,
  joinCapability: string,
): Promise<JoinSessionResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ joinCapability }),
    });
  } catch {
    throw networkError();
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw mapJoinStatus(res.status, body.error);
  }
  return (await res.json()) as JoinSessionResult;
}
