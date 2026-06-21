import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { InviteScreen } from '../screens/InviteScreen';
import { useSessionStore } from '../session/store';

export default function InviteRoute() {
  const router = useRouter();
  const peerPresent = useSessionStore((s) => s.peerPresent);

  // When the joiner connects, walk straight into Finding.
  useEffect(() => {
    if (peerPresent) router.replace('/finding');
  }, [peerPresent, router]);

  return <InviteScreen onClose={() => router.replace('/home')} />;
}
