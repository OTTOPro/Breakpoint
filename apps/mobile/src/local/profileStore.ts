import { create } from 'zustand';

import { getJSON, setJSON } from './storage';

const NAME_KEY = 'bp.profile.name';
const ONBOARDING_KEY = 'bp.onboarding.complete';

interface ProfileState {
  name: string;
  onboardingComplete: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: '',
  onboardingComplete: false,
  hydrated: false,
  hydrate: async () => {
    const [name, done] = await Promise.all([
      getJSON<string>(NAME_KEY),
      getJSON<boolean>(ONBOARDING_KEY),
    ]);
    // Don't clobber an in-memory name edit if nothing is persisted yet.
    set((prev) => ({
      name: name != null ? name : prev.name,
      onboardingComplete: done === true,
      hydrated: true,
    }));
  },
  setName: async (name: string) => {
    set({ name });
    await setJSON(NAME_KEY, name);
  },
  completeOnboarding: async () => {
    set({ onboardingComplete: true });
    await setJSON(ONBOARDING_KEY, true);
  },
}));

/** The display name used as your label when creating/joining a session. */
export function getSessionLabel(): string {
  const name = useProfileStore.getState().name.trim();
  return name || 'You';
}
