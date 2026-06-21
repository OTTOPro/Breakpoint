import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Navbar } from '../ui/Navbar';
import { Fonts, Palette, Radius } from '../ui/tokens';

/** Home launcher — one job: start finding someone, or join a code. */
export function HomeScreen({
  onFind,
  onJoin,
}: {
  onFind?: () => void;
  onJoin?: () => void;
}) {
  const recents = ['A', 'J', 'P', 'S'];
  return (
    <SafeAreaView testID="screen-home" style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hi}>Hey,</Text>
          <Text style={styles.name}>Maya</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
      </View>

      <Pressable testID="home-find" onPress={onFind} style={styles.findCard}>
        <View style={styles.plus}>
          <Text style={styles.plusText}>＋</Text>
        </View>
        <Text style={styles.findTitle}>Find someone</Text>
        <Text style={styles.findSub}>create a meeting point</Text>
      </Pressable>

      <Pressable testID="home-join" onPress={onJoin} style={styles.joinCard}>
        <View>
          <Text style={styles.joinTitle}>Got a code?</Text>
          <Text style={styles.joinSub}>join someone&apos;s session</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Text style={styles.recentsLabel}>Recents</Text>
      <View style={styles.recentsRow}>
        {recents.map((r) => (
          <View key={r} style={styles.recent}>
            <Text style={styles.recentText}>{r}</Text>
          </View>
        ))}
      </View>

      <View style={styles.navWrap}>
        <Navbar active="home" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 26, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  hi: { fontSize: 15, color: Palette.muted, fontWeight: '500', fontFamily: Fonts.sans },
  name: { fontSize: 28, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  findCard: { marginTop: 32, borderRadius: Radius.lg + 2, backgroundColor: Palette.ink, padding: 28 },
  plus: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Palette.pink, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontSize: 22, color: Palette.pinkInk, fontFamily: Fonts.sans },
  findTitle: { fontSize: 27, fontWeight: '600', color: Palette.white, marginTop: 54, fontFamily: Fonts.sans },
  findSub: { fontSize: 15, color: 'rgba(255,255,255,0.62)', marginTop: 6, fontFamily: Fonts.sans },
  joinCard: { marginTop: 14, borderWidth: 1, borderColor: Palette.hairline, backgroundColor: Palette.white, borderRadius: Radius.lg - 4, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinTitle: { fontSize: 17, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  joinSub: { fontSize: 14, color: Palette.muted, marginTop: 3, fontFamily: Fonts.sans },
  chevron: { fontSize: 20, color: '#C2C6CB', fontFamily: Fonts.sans },
  recentsLabel: { marginTop: 36, fontSize: 13, fontWeight: '600', letterSpacing: 1.4, color: Palette.faint, fontFamily: Fonts.sans },
  recentsRow: { flexDirection: 'row', gap: 18, marginTop: 18 },
  recent: { width: 54, height: 54, borderRadius: 27, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  recentText: { fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
