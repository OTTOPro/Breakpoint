/**
 * Control-plane HTTP client: create / join a session against the backend
 * Worker. Base URL is configurable (defaults to the local `wrangler dev`).
 */

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
  const res = await fetch(`${baseUrl}/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    throw new Error(`createSession failed: ${res.status}`);
  }
  return (await res.json()) as CreateSessionResult;
}

export async function joinSession(
  sessionId: string,
  joinCapability: string,
): Promise<JoinSessionResult> {
  const res = await fetch(`${baseUrl}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ joinCapability }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(`joinSession failed: ${res.status} ${body.error ?? ''}`);
  }
  return (await res.json()) as JoinSessionResult;
}
