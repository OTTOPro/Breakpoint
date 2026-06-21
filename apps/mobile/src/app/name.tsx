import { useRouter } from 'expo-router';

import { NameStepScreen } from '../screens/NameStepScreen';
import { useProfileStore } from '../local/profileStore';

export default function NameRoute() {
  const router = useRouter();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);

  // Last onboarding step: name is saved by the screen; here we flip the
  // onboarding flag (the only place it's set) and head home.
  const finish = async () => {
    await completeOnboarding();
    router.replace('/home');
  };

  return <NameStepScreen onDone={() => void finish()} />;
}
