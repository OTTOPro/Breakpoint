import { useRouter } from 'expo-router';

import { BootGate } from '../screens/BootGate';

/**
 * Root boot gate: hydrate, then redirect to /home (returning) or /onboarding
 * (first launch). Renders a splash until hydration is done — no onboarding
 * flash for returning users.
 */
export default function Index() {
  const router = useRouter();
  return (
    <BootGate
      onRoute={(target) =>
        router.replace(target === 'home' ? '/home' : '/onboarding')
      }
    />
  );
}
