import { describe, expect, it } from 'vitest';

import { ApiError, describeError, mapJoinStatus, networkError } from './errors';

describe('error mapping', () => {
  it('maps join HTTP statuses to clear kinds + messages', () => {
    expect(mapJoinStatus(403).kind).toBe('invalid_code');
    expect(mapJoinStatus(404).kind).toBe('not_found');
    expect(mapJoinStatus(409).kind).toBe('full');
    expect(mapJoinStatus(410).kind).toBe('expired');
    expect(mapJoinStatus(500).kind).toBe('server');

    for (const status of [403, 404, 409, 410]) {
      expect(mapJoinStatus(status).message.length).toBeGreaterThan(0);
    }
  });

  it('flags network failures distinctly', () => {
    expect(networkError().kind).toBe('network');
    expect(describeError(networkError())).toEqual({
      kind: 'network',
      message: networkError().message,
    });
  });

  it('describes unknown throwables safely', () => {
    expect(describeError(new Error('boom')).kind).toBe('unknown');
    expect(describeError('weird').kind).toBe('unknown');
  });

  it('ApiError carries status + code', () => {
    const e = new ApiError('full', 409, 'full', 'session_full');
    expect(e.status).toBe(409);
    expect(e.code).toBe('session_full');
  });
});
