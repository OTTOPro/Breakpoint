import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { FindingScreen } from '../screens/FindingScreen';
import { confirmMet, leaveSession } from '../session/flow';
import { useSessionStore } from '../session/store';

export default function FindingRoute() {
  const router = useRouter();
  const state = useSessionStore((s) => s.state);
  const connection = useSessionStore((s) => s.connection);

  // Failure states route to the failure screen.
  useEffect(() => {
    if (state === 'abandoned' || state === 'expired' || state === 'cancelled') {
      router.replace('/failure');
    } else if (state === 'ended') {
      router.replace('/done');
    } else if (connection === 'closed') {
      // WS reconnections exhausted — surface the lost-connection screen.
      router.replace('/failure');
    }
  }, [state, connection, router]);

  return (
    <FindingScreen
      onExit={() => {
        leaveSession();
        router.replace('/home');
      }}
      onFound={() => {
        confirmMet();
        router.replace('/done');
      }}
    />
  );
}
