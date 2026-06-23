import { Platform } from 'react-native';

/**
 * Secret storage. Native uses expo-secure-store (Keychain/Keystore); web falls
 * back to localStorage. The deviceSecret lives here — NEVER in AsyncStorage.
 */
function webStore(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  const g = globalThis as { localStorage?: Storage };
  return g.localStorage ?? null;
}

export async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return webStore()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require('expo-secure-store');
  return (await SecureStore.getItemAsync(key)) ?? null;
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      webStore()?.setItem(key, value);
    } catch {
      // best-effort on web
    }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}
