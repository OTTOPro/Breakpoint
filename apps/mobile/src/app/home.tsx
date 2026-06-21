import { useRouter } from 'expo-router';

import { HomeScreen } from '../screens/HomeScreen';
import { useTabNav } from '../navigation/useTabNav';
import { startAsInitiator } from '../session/flow';

export default function HomeRoute() {
  const router = useRouter();
  const goTab = useTabNav();
  const find = async () => {
    // Best-effort: kick off session creation, but navigate regardless so the
    // flow stays walkable even without a backend.
    void startAsInitiator();
    router.push('/invite');
  };
  return (
    <HomeScreen
      onFind={find}
      onJoin={() => router.push('/join')}
      onTab={goTab}
    />
  );
}
