import { useRouter } from 'expo-router';

import { HomeScreen } from '../screens/HomeScreen';
import { useTabNav } from '../navigation/useTabNav';
import { startAsInitiator } from '../session/flow';
import { useSessionStore } from '../session/store';

export default function HomeRoute() {
  const router = useRouter();
  const goTab = useTabNav();
  const phase = useSessionStore((s) => s.phase);
  const error = useSessionStore((s) => s.error);

  const find = async () => {
    if (phase === 'creating') return; // no double-submit
    const ok = await startAsInitiator();
    // Navigate to Invite once the session is created; stay on error otherwise.
    if (ok) router.push('/invite');
  };

  return (
    <HomeScreen
      onFind={find}
      onJoin={() => router.push('/join')}
      onTab={goTab}
      pending={phase === 'creating'}
      errorMessage={error?.phase === 'create' ? error.message : undefined}
    />
  );
}
