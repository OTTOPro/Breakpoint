import { useRouter } from 'expo-router';

import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';

export default function DiagnosticsRoute() {
  const router = useRouter();
  return <DiagnosticsScreen onClose={() => router.back()} />;
}
