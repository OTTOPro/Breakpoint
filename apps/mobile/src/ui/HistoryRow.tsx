import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HistoryOutcome, NormalizedEntry } from '../local/historyStore';

import { formatDuration, relativeTime } from './timeFormat';
import { Fonts, Palette, Radius } from './tokens';

export const OUTCOME_BADGE: Record<
  HistoryOutcome,
  { label: string; bg: string; fg: string }
> = {
  met: { label: 'Met', bg: '#E4F1EA', fg: '#1F6B47' },
  abandoned: { label: 'Left', bg: '#FBF0E2', fg: '#8A5A1B' },
  expired: { label: 'Expired', bg: '#ECEDEF', fg: '#5C636A' },
  lost: { label: 'Lost', bg: '#FBEAEA', fg: '#72243E' },
};

/**
 * One rich history row (name · relative time · duration · outcome badge).
 * Shared by the History screen and the Home recents preview — single source of
 * truth for how a meetup renders. Pass `onPress` to make it tappable.
 */
export function HistoryRow({
  entry,
  now,
  onPress,
  testID = 'history-entry',
}: {
  entry: NormalizedEntry;
  now: number;
  onPress?: () => void;
  testID?: string;
}) {
  const badge = OUTCOME_BADGE[entry.outcome];
  const duration = formatDuration(entry.durationMs);
  const sub = duration
    ? `${relativeTime(entry.endedAt, now)} · ${duration}`
    : relativeTime(entry.endedAt, now);

  const inner = (
    <>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{entry.peerLabel.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{entry.peerLabel}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <View testID="history-badge" style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${entry.peerLabel}, ${badge.label}, ${sub}`}
        style={styles.row}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={styles.row}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Palette.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  sub: { fontSize: 13, color: Palette.muted, marginTop: 2, fontFamily: Fonts.sans },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
});
