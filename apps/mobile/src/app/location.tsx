import { useRouter } from 'expo-router';

import { PermissionScreen } from '../screens/PermissionScreen';
import { requestProximityPermissions } from '../proximity/permissions';

export default function LocationRoute() {
  const router = useRouter();
  const next = async () => {
    try {
      await requestProximityPermissions();
    } catch {
      // best-effort
    }
    router.push('/home');
  };
  return (
    <PermissionScreen
      testID="screen-location"
      glyph="◎"
      glyphBg="#CECBF6"
      glyphColor="#3C3489"
      title="Share your location"
      body="Only with the person you’re meeting, and only while the session is open. It closes the second you find each other. Nobody else sees a thing."
      primaryLabel="Allow while using"
      onAllow={next}
      onSkip={() => router.push('/home')}
      onBack={() => router.back()}
    />
  );
}
