import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeEntry, useHistoryStore } from '../local/historyStore';
import { HistoryRow } from '../ui/HistoryRow';
import { Navbar, type TabKey } from '../ui/Navbar';
import { Fonts, Palette } from '../ui/tokens';

/** History — local list of finished meetups, newest-first, with rich details. */
export function HistoryScreen({ onTab }: { onTab?: (tab: TabKey) => void }) {
  const entries = useHistoryStore((s) => s.entries);
  const hydrate = useHistoryStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const now = Date.now();
  const rows = entries
    .map(normalizeEntry)
    .sort((a, b) => b.endedAt - a.endedAt); // newest first

  return (
    <SafeAreaView testID="screen-history" style={styles.root}>
      <Text style={styles.h1}>History</Text>

      {rows.length === 0 ? (
        <View testID="history-empty" style={styles.empty}>
          <Text style={styles.emptyText}>Your meetups will show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((e) => (
            <HistoryRow key={e.id} entry={e} now={now} />
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
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
