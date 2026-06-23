import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureDeviceIdentity, installNameSync } from '../local/identity';

/** Root stack — full-screen flow, no tabs (the Finding screen owns the focus). */
export default function RootLayout() {
  // V2 device identity: register the anonymous device on launch and keep its
  // display name in sync with the profile. Non-blocking, additive.
  useEffect(() => {
    installNameSync();
    void ensureDeviceIdentity();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
