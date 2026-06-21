import { describe, expect, it } from 'vitest';

import { buildJoinUrl, parseJoinUrl } from './joinLink';

const ORIGIN = 'https://breakpoint.app';
const SID = '8ef60038-6984-4a27-bae5-6e260c6a46c7';
const CAP = 'Lf34XivU9JStrmBBzOBypSPNVkywZf30l2IM_JzYB78';

describe('joinLink — capability lives ONLY in the fragment', () => {
  const url = buildJoinUrl(ORIGIN, SID, CAP);

  it('puts the capability in the fragment, never the query or path', () => {
    const beforeHash = url.split('#')[0]!;
    // The secret must not appear anywhere a server would log (query/path).
    expect(beforeHash).not.toContain(CAP);
    expect(beforeHash).not.toContain('cap=');
    // It IS present in the fragment.
    expect(url).toContain(`#cap=${encodeURIComponent(CAP)}`);
    // The query carries only the (non-secret) sessionId.
    expect(new URL(url).searchParams.get('sid')).toBe(SID);
    expect(new URL(url).searchParams.get('cap')).toBeNull();
  });

  it('parses the sessionId from the query and capability from the fragment', () => {
    const parsed = parseJoinUrl(url);
    expect(parsed).toEqual({ sessionId: SID, capability: CAP });
  });

  it('returns null for a link missing the capability fragment', () => {
    expect(parseJoinUrl(`${ORIGIN}/j?sid=${SID}`)).toBeNull();
    expect(parseJoinUrl('not a url')).toBeNull();
  });
});
