import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { JoinScreen } from '../screens/JoinScreen';
import { startAsJoiner } from '../session/flow';
import { parseJoinTarget } from '../session/joinLink';
import { useSessionStore } from '../session/store';

/** On web, read the current URL's join target (sid in query, cap in fragment). */
function readDeepLink(): { sessionId: string; capability: string } | null {
  const g = globalThis as { location?: { search?: string; hash?: string } };
  if (!g.location) return null;
  return parseJoinTarget(g.location.search ?? '', g.location.hash ?? '');
}

export default function JoinRoute() {
  const router = useRouter();
  const phase = useSessionStore((s) => s.phase);
  const error = useSessionStore((s) => s.error);
  const handled = useRef(false);

  // Auto-join when opened from a share link (e.g. the second tab).
  useEffect(() => {
    if (handled.current) return;
    const target = readDeepLink();
    if (!target) return;
    handled.current = true;
    void startAsJoiner(target.sessionId, target.capability).then((ok) => {
      if (ok) router.replace('/finding');
    });
  }, [router]);

  const onJoin = async (code: string) => {
    if (phase === 'joining') return; // no double-submit
    // A typed 6-char code can't resolve a session on its own (addressing is V2);
    // real joins come from the share link handled above.
    router.replace('/finding');
    void code;
  };

  return (
    <JoinScreen
      onClose={() => router.replace('/home')}
      onJoin={onJoin}
      pending={phase === 'joining'}
      errorMessage={error?.phase === 'join' ? error.message : undefined}
    />
  );
}
