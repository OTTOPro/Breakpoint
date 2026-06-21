import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionLabel, useProfileStore } from '../local/profileStore';

import { NameStepScreen } from './NameStepScreen';

afterEach(cleanup);
beforeEach(async () => {
  await AsyncStorage.clear?.();
  useProfileStore.setState({ name: '', onboardingComplete: false, hydrated: false });
});

describe('NameStepScreen — onboarding name capture', () => {
  it('writes the typed name into profileStore and feeds the session label', async () => {
    const onDone = vi.fn();
    const r = render(<NameStepScreen onDone={onDone} />);

    fireEvent.change(r.getByTestId('name-input'), { target: { value: 'Othmane' } });
    fireEvent.click(r.getByTestId('name-continue'));

    await waitFor(() => expect(useProfileStore.getState().name).toBe('Othmane'));
    expect(getSessionLabel()).toBe('Othmane');
    expect(onDone).toHaveBeenCalled();
  });
});
