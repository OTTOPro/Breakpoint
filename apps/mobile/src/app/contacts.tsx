import { useRouter } from 'expo-router';

import { ContactsScreen } from '../screens/ContactsScreen';
import { useTabNav } from '../navigation/useTabNav';

export default function ContactsRoute() {
  const goTab = useTabNav();
  const router = useRouter();
  // Cosmetic only — no peer addressing (V2). Tapping just heads to Home.
  return <ContactsScreen onTab={goTab} onPick={() => router.replace('/home')} />;
}
