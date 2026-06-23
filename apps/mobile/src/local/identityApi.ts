import { getBaseUrl } from '../session/api';

/**
 * Device-identity control-plane calls (V2 Phase 1). Best-effort: failures are
 * swallowed (identity is non-blocking plumbing).
 */
export interface RegisterResult {
  deviceId: string;
  /** Returned ONLY on the first registration. */
  deviceSecret?: string;
  registered?: boolean;
}

export async function registerDevice(
  deviceId: string,
  displayName: string,
): Promise<RegisterResult | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/devices/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId, displayName }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RegisterResult;
  } catch {
    return null;
  }
}

export async function updateDeviceName(
  deviceId: string,
  deviceSecret: string,
  displayName: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/devices/update`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId, deviceSecret, displayName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
