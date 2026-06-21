/**
 * Typed control-plane errors with user-facing messages. Pure + testable.
 */
export type ErrorKind =
  | 'network'
  | 'invalid_code'
  | 'not_found'
  | 'full'
  | 'expired'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const NETWORK_MESSAGE =
  "Can't reach BreakPoint. Check your connection and try again.";

export function networkError(): ApiError {
  return new ApiError('network', 0, NETWORK_MESSAGE);
}

/** Map a /sessions create failure to a typed error. */
export function mapCreateStatus(status: number, code?: string): ApiError {
  const kind: ErrorKind = status >= 500 ? 'server' : 'unknown';
  return new ApiError(kind, status, "Couldn't start a session. Please try again.", code);
}

/** Map a /join failure (403/404/409/410) to a clear message. */
export function mapJoinStatus(status: number, code?: string): ApiError {
  switch (status) {
    case 403:
      return new ApiError('invalid_code', 403, "That code didn't match. Double-check it and try again.", code);
    case 404:
      return new ApiError('not_found', 404, "We couldn't find that session — the link may be wrong.", code);
    case 409:
      return new ApiError('full', 409, 'That session is already full.', code);
    case 410:
      return new ApiError('expired', 410, 'That invite has expired — ask for a new one.', code);
    default:
      return new ApiError(status >= 500 ? 'server' : 'unknown', status, "Couldn't join the session. Please try again.", code);
  }
}

/** Normalise any thrown value into a kind + message for the UI. */
export function describeError(err: unknown): { kind: ErrorKind; message: string } {
  if (err instanceof ApiError) return { kind: err.kind, message: err.message };
  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}
