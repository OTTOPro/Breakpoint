import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHistoryStore, type HistoryEntry } from '../local/historyStore';
import { Navbar, type TabKey } from '../ui/Navbar';
import { Fonts, Palette, Radius } from '../ui/tokens';

function formatWhen(at: number): string {
  const d = new Date(at);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** History — local list of finished meetups. Clean empty state. */
export function HistoryScreen({ onTab }: { onTab?: (tab: TabKey) => void }) {
  const entries = useHistoryStore((s) => s.entries);
  const hydrate = useHistoryStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaView testID="screen-history" style={styles.root}>
      <Text style={styles.h1}>History</Text>

      {entries.length === 0 ? (
        <View testID="history-empty" style={styles.empty}>
          <Text style={styles.emptyText}>Your meetups will show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {entries.map((e: HistoryEntry) => (
            <View key={e.id} testID="history-entry" style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(e.peerLabel ?? 'S').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{e.peerLabel ?? 'Someone'}</Text>
                <Text style={styles.rowSub}>{formatWhen(e.at)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.navWrap}>
        <Navbar active="history" onSelect={onTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 26, paddingTop: 12 },
  h1: { fontSize: 28, fontWeight: '600', color: Palette.ink, marginTop: 8, marginBottom: 16, fontFamily: Fonts.sans },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Palette.muted, fontFamily: Fonts.sans },
  list: { gap: 12, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Palette.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  rowSub: { fontSize: 13, color: Palette.muted, marginTop: 2, fontFamily: Fonts.sans },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
