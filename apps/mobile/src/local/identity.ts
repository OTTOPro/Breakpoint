import { registerDevice, updateDeviceName } from './identityApi';
import { useProfileStore } from './profileStore';
import { getSecret, setSecret } from './secureStore';
import { getJSON, setJSON } from './storage';

const DEVICE_ID_KEY = 'bp.deviceId';
const SECRET_KEY = 'bp.deviceSecret';

/** Crypto-strong UUID v4 (never Math.random). */
function newDeviceId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6]! & 0x0f) | 0x40; // version 4
    b[8] = (b[8]! & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Crypto = require('expo-crypto');
  return Crypto.randomUUID();
}

/** The persisted public device handle (or null before first registration). */
export async function getDeviceId(): Promise<string | null> {
  return (await getJSON<string>(DEVICE_ID_KEY)) ?? null;
}

/**
 * First launch: generate + persist a deviceId, register it, and store the
 * server-issued deviceSecret in secure storage. Later launches: re-register to
 * bump lastSeenAt (no new secret). Non-blocking — failures are tolerated.
 */
export async function ensureDeviceIdentity(displayName?: string): Promise<string> {
  let deviceId = await getJSON<string>(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = newDeviceId();
    await setJSON(DEVICE_ID_KEY, deviceId);
  }

  const name = displayName ?? useProfileStore.getState().name;
  const res = await registerDevice(deviceId, name);
  if (res?.deviceSecret) {
    await setSecret(SECRET_KEY, res.deviceSecret);
  }
  return deviceId;
}

/** Push a display-name change to the server (requires the stored secret). */
export async function syncDeviceName(displayName: string): Promise<boolean> {
  const deviceId = await getJSON<string>(DEVICE_ID_KEY);
  const secret = await getSecret(SECRET_KEY);
  if (!deviceId || !secret) return false;
  return updateDeviceName(deviceId, secret, displayName);
}

let nameSyncUnsub: (() => void) | null = null;

/**
 * Wire the profileStore (the single source of the display name) to the device
 * record: whenever the name changes, sync it. Idempotent.
 */
export function installNameSync(): void {
  if (nameSyncUnsub) return;
  nameSyncUnsub = useProfileStore.subscribe((state, prev) => {
    const next = state.name.trim();
    if (next && next !== prev.name.trim()) {
      void syncDeviceName(next);
    }
  });
}
