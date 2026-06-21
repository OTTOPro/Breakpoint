import { useRouter } from 'expo-router';

import { JoinScreen } from '../screens/JoinScreen';

export default function JoinRoute() {
  const router = useRouter();
  // Real joins arrive via a share link (sessionId + capability); the typed
  // code is a convenience. Either way we enter Finding once joined.
  return (
    <JoinScreen
      onClose={() => router.replace('/home')}
      onJoin={() => router.replace('/finding')}
    />
  );
}
