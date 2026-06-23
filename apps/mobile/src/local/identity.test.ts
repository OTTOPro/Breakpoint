import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the network layer; exercise the identity orchestration + storage.
vi.mock('./identityApi', () => ({
  registerDevice: vi.fn(),
  updateDeviceName: vi.fn(),
}));

import {
  ensureDeviceIdentity,
  getDeviceId,
  installNameSync,
  syncDeviceName,
} from './identity';
import { registerDevice, updateDeviceName } from './identityApi';
import { useProfileStore } from './profileStore';
import { getSecret } from './secureStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeEach(async () => {
  await AsyncStorage.clear?.();
  (globalThis as { localStorage?: Storage }).localStorage?.clear();
  useProfileStore.setState({ name: '', onboardingComplete: false, hydrated: false });
  vi.clearAllMocks();
});

describe('device identity — first launch', () => {
  it('generates + persists a deviceId, registers, and stores the secret', async () => {
    vi.mocked(registerDevice).mockResolvedValue({
      deviceId: 'srv',
      deviceSecret: 'SEKRET',
      registered: true,
    });

    const deviceId = await ensureDeviceIdentity('Maya');

    expect(deviceId).toMatch(UUID_RE);
    expect(await getDeviceId()).toBe(deviceId); // persisted (AsyncStorage)
    expect(registerDevice).toHaveBeenCalledWith(deviceId, 'Maya');
    // secret kept in secure storage (localStorage on web), NOT AsyncStorage
    expect(await getSecret('bp.deviceSecret')).toBe('SEKRET');
    expect(await AsyncStorage.getItem('bp.deviceSecret')).toBeNull();
  });
});

describe('device identity — later launches', () => {
  it('reuses the deviceId and never overwrites the stored secret', async () => {
    vi.mocked(registerDevice).mockResolvedValue({ deviceId: 'srv', deviceSecret: 'FIRST', registered: true });
    const id1 = await ensureDeviceIdentity('Maya');

    // re-registration returns no secret (re-announce)
    vi.mocked(registerDevice).mockResolvedValue({ deviceId: id1, registered: true });
    const id2 = await ensureDeviceIdentity('Maya');

    expect(id2).toBe(id1);
    expect(await getSecret('bp.deviceSecret')).toBe('FIRST');
  });
});

describe('device identity — name sync', () => {
  it('syncDeviceName posts /devices/update with the stored id + secret', async () => {
    vi.mocked(registerDevice).mockResolvedValue({ deviceId: 'srv', deviceSecret: 'SEK', registered: true });
    const id = await ensureDeviceIdentity('Maya');

    vi.mocked(updateDeviceName).mockResolvedValue(true);
    expect(await syncDeviceName('Renamed')).toBe(true);
    expect(updateDeviceName).toHaveBeenCalledWith(id, 'SEK', 'Renamed');
  });

  it('no-ops when there is no identity yet', async () => {
    vi.mocked(updateDeviceName).mockResolvedValue(true);
    expect(await syncDeviceName('X')).toBe(false);
    expect(updateDeviceName).not.toHaveBeenCalled();
  });

  it('renaming the profile triggers a device update (single source of name)', async () => {
    vi.mocked(registerDevice).mockResolvedValue({ deviceId: 'srv', deviceSecret: 'SEK', registered: true });
    const id = await ensureDeviceIdentity('');
    vi.mocked(updateDeviceName).mockResolvedValue(true);

    installNameSync();
    await useProfileStore.getState().setName('Othmane');

    await waitFor(() =>
      expect(updateDeviceName).toHaveBeenCalledWith(id, 'SEK', 'Othmane'),
    );
  });
});
