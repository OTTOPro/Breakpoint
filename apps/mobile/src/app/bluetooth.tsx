import { useRouter } from 'expo-router';

import { PermissionScreen } from '../screens/PermissionScreen';
import { requestProximityPermissions } from '../proximity/permissions';

export default function BluetoothRoute() {
  const router = useRouter();
  const next = async () => {
    let granted = false;
    try {
      granted = await requestProximityPermissions();
    } catch {
      granted = false;
    }
    router.push(granted ? '/location' : '/permission-denied');
  };
  return (
    <PermissionScreen
      testID="screen-bluetooth"
      glyph="✶"
      glyphBg="#C7DBE2"
      glyphColor="#2C4A54"
      title="Turn on Bluetooth"
      body="It’s how your phones sense each other up close — way tighter than GPS when you’re nearly there. We only ask now because you’re about to need it."
      primaryLabel="Allow Bluetooth"
      onAllow={next}
      onSkip={() => router.push('/location')}
      onBack={() => router.back()}
    />
  );
}
