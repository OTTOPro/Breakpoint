import { useRouter } from 'expo-router';

import { PermissionScreen } from '../screens/PermissionScreen';
import { requestProximityPermissions } from '../proximity/permissions';

export default function LocationRoute() {
  const router = useRouter();
  const next = async () => {
    let granted = false;
    try {
      granted = await requestProximityPermissions();
    } catch {
      granted = false;
    }
    router.push(granted ? '/name' : '/permission-denied');
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
      onSkip={() => router.push('/name')}
      onBack={() => router.back()}
    />
  );
}
