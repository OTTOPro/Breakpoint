import { ProfileScreen } from '../screens/ProfileScreen';
import { useTabNav } from '../navigation/useTabNav';

export default function ProfileRoute() {
  const goTab = useTabNav();
  return <ProfileScreen onTab={goTab} />;
}
