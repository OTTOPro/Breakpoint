import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileStore } from '../local/profileStore';

import { BootGate } from './BootGate';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useProfileStore.setState({ name: '', onboardingComplete: false, hydrated: false });
});

describe('BootGate — first-launch routing', () => {
  it('empty storage → routes to onboarding', async () => {
    const onRoute = vi.fn();
    render(<BootGate onRoute={onRoute} />);
    await waitFor(() => expect(onRoute).toHaveBeenCalledWith('onboarding'));
  });

  it('persisted flag → routes straight to home', async () => {
    await AsyncStorage.setItem('bp.onboarding.complete', JSON.stringify(true));
    const onRoute = vi.fn();
    render(<BootGate onRoute={onRoute} />);
    await waitFor(() => expect(onRoute).toHaveBeenCalledWith('home'));
  });

  it('waits for hydration (no onboarding flash for returning users)', async () => {
    await AsyncStorage.setItem('bp.onboarding.complete', JSON.stringify(true));
    const onRoute = vi.fn();
    const r = render(<BootGate onRoute={onRoute} />);

    // Before hydration resolves: a splash is shown and NO route decision made.
    expect(r.getByTestId('boot-splash')).toBeTruthy();
    expect(onRoute).not.toHaveBeenCalled();

    // Once hydrated, it goes home — never to onboarding.
    await waitFor(() => expect(onRoute).toHaveBeenCalledTimes(1));
    expect(onRoute).toHaveBeenCalledWith('home');
    expect(onRoute).not.toHaveBeenCalledWith('onboarding');
    // The gate itself never renders onboarding content.
    expect(r.getByTestId('boot-splash')).toBeTruthy();
  });
});
