import { useRouter } from 'expo-router';

import { PermissionDeniedScreen } from '../screens/PermissionDeniedScreen';

export default function PermissionDeniedRoute() {
  const router = useRouter();
  return (
    <PermissionDeniedScreen
      onRetry={() => router.back()}
      onBack={() => router.replace('/home')}
    />
  );
}
