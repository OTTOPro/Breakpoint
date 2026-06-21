import { useRouter } from 'expo-router';

import { JoinScreen } from '../screens/JoinScreen';
import { startAsJoinerFromLink } from '../session/flow';
import { useSessionStore } from '../session/store';

export default function JoinRoute() {
  const router = useRouter();
  const phase = useSessionStore((s) => s.phase);
  const error = useSessionStore((s) => s.error);

  const onJoin = async (code: string) => {
    if (phase === 'joining') return; // no double-submit
    // Real joins arrive via a share link (sessionId + capability in the
    // fragment); a typed code alone can't resolve a session, so it just walks
    // into Finding for the demo.
    if (code.startsWith('http')) {
      const ok = await startAsJoinerFromLink(code);
      if (ok) router.replace('/finding');
      return;
    }
    router.replace('/finding');
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
