import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  normalizeEntry,
  useHistoryStore,
  type HistoryOutcome,
} from '../local/historyStore';
import { Navbar, type TabKey } from '../ui/Navbar';
import { formatDuration, relativeTime } from '../ui/timeFormat';
import { Fonts, Palette, Radius } from '../ui/tokens';

const OUTCOME_BADGE: Record<
  HistoryOutcome,
  { label: string; bg: string; fg: string }
> = {
  met: { label: 'Met', bg: '#E4F1EA', fg: '#1F6B47' },
  abandoned: { label: 'Left', bg: '#FBF0E2', fg: '#8A5A1B' },
  expired: { label: 'Expired', bg: '#ECEDEF', fg: '#5C636A' },
  lost: { label: 'Lost', bg: '#FBEAEA', fg: '#72243E' },
};

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
          {rows.map((e) => {
            const badge = OUTCOME_BADGE[e.outcome];
            const duration = formatDuration(e.durationMs);
            const sub = duration
              ? `${relativeTime(e.endedAt, now)} · ${duration}`
              : relativeTime(e.endedAt, now);
            return (
              <View key={e.id} testID="history-entry" style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {e.peerLabel.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{e.peerLabel}</Text>
                  <Text style={styles.rowSub}>{sub}</Text>
                </View>
                <View
                  testID="history-badge"
                  style={[styles.badge, { backgroundColor: badge.bg }]}
                >
                  <Text style={[styles.badgeText, { color: badge.fg }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>
            );
          })}
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
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
