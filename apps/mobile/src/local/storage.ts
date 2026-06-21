import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny local-storage wrapper (AsyncStorage under the hood — localStorage on
 * web, native KV on device). Everything in this app's "local" layer is phone-
 * only: no backend persistence (the DO stays ephemeral).
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort; local persistence is non-critical
  }
}
