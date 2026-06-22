import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeEntry, useHistoryStore } from '../local/historyStore';
import { useProfileStore } from '../local/profileStore';
import { HistoryRow } from '../ui/HistoryRow';
import { Navbar, type TabKey } from '../ui/Navbar';
import { Fonts, Palette, Radius } from '../ui/tokens';

const RECENTS_PREVIEW = 3;

/** Home launcher — dynamic greeting, the find/join actions, and a live
 *  preview of recent meetups. No static placeholders. No map (device phase). */
export function HomeScreen({
  onFind,
  onJoin,
  onTab,
  onRecents,
  pending = false,
  errorMessage,
}: {
  onFind?: () => void;
  onJoin?: () => void;
  onTab?: (tab: TabKey) => void;
  onRecents?: () => void;
  pending?: boolean;
  errorMessage?: string;
}) {
  const name = useProfileStore((s) => s.name);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const entries = useHistoryStore((s) => s.entries);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateProfile();
    void hydrateHistory();
  }, [hydrateProfile, hydrateHistory]);

  const displayName = name.trim() || 'there';
  const initial = displayName.charAt(0).toUpperCase();

  const now = Date.now();
  const recents = entries
    .map(normalizeEntry)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, RECENTS_PREVIEW);

  return (
    <SafeAreaView testID="screen-home" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>Hey,</Text>
            <Text testID="home-greeting" style={styles.name}>{displayName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <Pressable
          testID="home-find"
          onPress={pending ? undefined : onFind}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel="Find someone — create a meeting point"
          accessibilityState={{ disabled: pending }}
          style={[styles.findCard, pending && styles.findCardPending]}
        >
          <View style={styles.plus}>
            <Text style={styles.plusText}>＋</Text>
          </View>
          <Text style={styles.findTitle}>{pending ? 'Starting…' : 'Find someone'}</Text>
          <Text style={styles.findSub}>create a meeting point</Text>
          {/* Proximity gradient accent (cold→warm). Static — reduced-motion safe. */}
          <View style={styles.accent}>
            <View style={[styles.accentSeg, { backgroundColor: Palette.teal }]} />
            <View style={[styles.accentSeg, { backgroundColor: Palette.lavender }]} />
            <View style={[styles.accentSeg, { backgroundColor: Palette.pink }]} />
          </View>
          {pending && (
            <ActivityIndicator testID="home-pending" color={Palette.white} style={styles.spinner} />
          )}
        </Pressable>

        {errorMessage ? (
          <Pressable
            testID="home-error"
            onPress={pending ? undefined : onFind}
            accessibilityRole="button"
            accessibilityLabel={`${errorMessage} Tap to try again.`}
            style={styles.errorBox}
          >
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.errorRetry}>Tap to try again</Text>
          </Pressable>
        ) : null}

        <Pressable
          testID="home-join"
          onPress={onJoin}
          accessibilityRole="button"
          accessibilityLabel="Join with a code"
          style={styles.joinCard}
        >
          <View>
            <Text style={styles.joinTitle}>Got a code?</Text>
            <Text style={styles.joinSub}>join someone&apos;s session</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.recentsHead}>
          <Text style={styles.recentsLabel}>Recents</Text>
          {recents.length > 0 ? (
            <Pressable
              testID="home-recents-all"
              onPress={onRecents}
              accessibilityRole="button"
              accessibilityLabel="See all meetups"
              style={styles.seeAll}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        {recents.length === 0 ? (
          <View testID="home-recents-empty" style={styles.recentsEmpty}>
            <Text style={styles.recentsEmptyText}>No meetups yet — find someone above.</Text>
          </View>
        ) : (
          <View style={styles.recentsList}>
            {recents.map((e) => (
              <HistoryRow
                key={e.id}
                entry={e}
                now={now}
                onPress={onRecents}
                testID="home-recent"
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.navWrap}>
        <Navbar active="home" onSelect={onTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 26, paddingTop: 8 },
  scroll: { paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  hi: { fontSize: 15, color: Palette.muted, fontWeight: '500', fontFamily: Fonts.sans },
  name: { fontSize: 28, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  findCard: { marginTop: 28, borderRadius: Radius.lg + 2, backgroundColor: Palette.ink, padding: 28 },
  findCardPending: { opacity: 0.6 },
  spinner: { position: 'absolute', top: 28, right: 28 },
  errorBox: { marginTop: 14, borderRadius: Radius.md, backgroundColor: '#FBEAEA', borderWidth: 1, borderColor: '#E7B4B4', padding: 16 },
  errorText: { fontSize: 15, color: '#72243E', fontFamily: Fonts.sans },
  errorRetry: { fontSize: 13, fontWeight: '600', color: '#72243E', marginTop: 6, fontFamily: Fonts.sans },
  plus: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Palette.pink, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontSize: 22, color: Palette.pinkInk, fontFamily: Fonts.sans },
  findTitle: { fontSize: 27, fontWeight: '600', color: Palette.white, marginTop: 48, fontFamily: Fonts.sans },
  findSub: { fontSize: 15, color: 'rgba(255,255,255,0.62)', marginTop: 6, fontFamily: Fonts.sans },
  accent: { flexDirection: 'row', gap: 6, marginTop: 22 },
  accentSeg: { flex: 1, height: 5, borderRadius: 3 },
  joinCard: { marginTop: 14, borderWidth: 1, borderColor: Palette.hairline, backgroundColor: Palette.white, borderRadius: Radius.lg - 4, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinTitle: { fontSize: 17, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  joinSub: { fontSize: 14, color: Palette.muted, marginTop: 3, fontFamily: Fonts.sans },
  chevron: { fontSize: 20, color: '#C2C6CB', fontFamily: Fonts.sans },
  recentsHead: { marginTop: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentsLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 1.4, color: Palette.faint, fontFamily: Fonts.sans },
  seeAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: Palette.tealInk, fontFamily: Fonts.sans },
  recentsEmpty: { marginTop: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, borderStyle: 'dashed', padding: 20, alignItems: 'center' },
  recentsEmptyText: { fontSize: 14, color: Palette.muted, fontFamily: Fonts.sans },
  recentsList: { marginTop: 12, gap: 10 },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
