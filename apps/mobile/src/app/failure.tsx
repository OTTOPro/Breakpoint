import { useRouter } from 'expo-router';

import { FailureScreen } from '../screens/FailureScreen';
import { leaveSession } from '../session/flow';

export default function FailureRoute() {
  const router = useRouter();
  return (
    <FailureScreen
      onHome={() => {
        leaveSession();
        router.replace('/home');
      }}
    />
  );
}
