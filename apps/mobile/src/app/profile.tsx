import { useRouter } from 'expo-router';

import { ProfileScreen } from '../screens/ProfileScreen';
import { useTabNav } from '../navigation/useTabNav';

export default function ProfileRoute() {
  const goTab = useTabNav();
  const router = useRouter();
  return <ProfileScreen onTab={goTab} onDiagnostics={() => router.push('/diagnostics')} />;
}
