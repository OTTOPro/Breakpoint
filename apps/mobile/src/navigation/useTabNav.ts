import { useRouter } from 'expo-router';

import type { TabKey } from '../ui/Navbar';

const TAB_ROUTES: Record<TabKey, string> = {
  home: '/home',
  history: '/history',
  contacts: '/contacts',
  profile: '/profile',
};

/** Maps a navbar tab to its route. Used by the four nav screens. */
export function useTabNav(): (tab: TabKey) => void {
  const router = useRouter();
  return (tab: TabKey) => router.replace(TAB_ROUTES[tab]);
}
