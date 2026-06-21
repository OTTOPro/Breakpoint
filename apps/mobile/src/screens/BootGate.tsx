import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useProfileStore } from '../local/profileStore';
import { Palette } from '../ui/tokens';

export type BootTarget = 'home' | 'onboarding';

/**
 * Boot gate. Hydrates the local stores, then decides where to go:
 * onboarding (first launch) vs home (returning). It ALWAYS renders the splash
 * and never the onboarding itself — navigation moves away once hydration
 * finishes — so a returning user never sees an onboarding flash.
 */
export function BootGate({ onRoute }: { onRoute?: (target: BootTarget) => void }) {
  const hydrated = useProfileStore((s) => s.hydrated);
  const complete = useProfileStore((s) => s.onboardingComplete);
  const hydrate = useProfileStore((s) => s.hydrate);
  const decided = useRef(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !decided.current) {
      decided.current = true;
      onRoute?.(complete ? 'home' : 'onboarding');
    }
  }, [hydrated, complete, onRoute]);

  return <View testID="boot-splash" style={styles.splash} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Palette.setupBg },
});
