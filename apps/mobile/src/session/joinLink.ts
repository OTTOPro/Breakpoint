/**
 * Join-link format. The capability is a secret, so it lives ONLY in the URL
 * fragment (`…#cap=…`): fragments are never sent to servers (no access logs)
 * nor leaked via the Referer header. The sessionId (a random routing id, not a
 * secret) sits in the query. The capability then travels in the POST /join
 * body — never in a URL the network can see.
 */
export interface JoinLink {
  sessionId: string;
  capability: string;
}

export function buildJoinUrl(
  origin: string,
  sessionId: string,
  capability: string,
): string {
  return `${origin}/j?sid=${encodeURIComponent(sessionId)}#cap=${encodeURIComponent(capability)}`;
}

/** Build a link that opens THIS app's /join route (capability kept in fragment). */
export function buildAppJoinLink(
  origin: string,
  sessionId: string,
  capability: string,
): string {
  return `${origin}/join?sid=${encodeURIComponent(sessionId)}#cap=${encodeURIComponent(capability)}`;
}

/** Read sessionId (query) + capability (fragment) from a join deep link. */
export function parseJoinTarget(search: string, hash: string): JoinLink | null {
  const sessionId = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  ).get('sid');
  const capability = new URLSearchParams(
    hash.startsWith('#') ? hash.slice(1) : hash,
  ).get('cap');
  if (!sessionId || !capability) return null;
  return { sessionId, capability };
}

/** Parse a join URL / deep link, reading the capability from the fragment. */
export function parseJoinUrl(raw: string): JoinLink | null {
  try {
    const url = new URL(raw);
    const sessionId = url.searchParams.get('sid');
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const capability = new URLSearchParams(fragment).get('cap');
    if (!sessionId || !capability) return null;
    return { sessionId, capability };
  } catch {
    return null;
  }
}
