import { HistoryScreen } from '../screens/HistoryScreen';
import { useTabNav } from '../navigation/useTabNav';

export default function HistoryRoute() {
  const goTab = useTabNav();
  return <HistoryScreen onTab={goTab} />;
}
