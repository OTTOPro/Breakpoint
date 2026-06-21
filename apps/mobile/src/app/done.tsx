import { useRouter } from 'expo-router';

import { DoneScreen } from '../screens/DoneScreen';
import { leaveSession } from '../session/flow';

export default function DoneRoute() {
  const router = useRouter();
  return (
    <DoneScreen
      onDone={() => {
        leaveSession();
        router.replace('/home');
      }}
    />
  );
}
