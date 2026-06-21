import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfileStore } from '../local/profileStore';
import { requestProximityPermissions } from '../proximity/permissions';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Navbar, type TabKey } from '../ui/Navbar';
import { Fonts, Palette, Radius } from '../ui/tokens';

const APP_VERSION = '1.0.0';

/** Profile — edit your display name (your session label), permissions, about. */
export function ProfileScreen({ onTab }: { onTab?: (tab: TabKey) => void }) {
  const name = useProfileStore((s) => s.name);
  const hydrate = useProfileStore((s) => s.hydrate);
  const setName = useProfileStore((s) => s.setName);

  const [draft, setDraft] = useState(name);
  const [permState, setPermState] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Keep the input in sync once the persisted name hydrates.
  useEffect(() => {
    setDraft(name);
  }, [name]);

  const recheck = async () => {
    try {
      const ok = await requestProximityPermissions();
      setPermState(ok ? 'granted' : 'denied');
    } catch {
      setPermState('denied');
    }
  };

  return (
    <SafeAreaView testID="screen-profile" style={styles.root}>
      <Text style={styles.h1}>Profile</Text>

      <Text style={styles.label}>Display name</Text>
      <Text style={styles.hint}>Shown to the person you meet, as your session label.</Text>
      <TextInput
        testID="profile-name-input"
        value={draft}
        onChangeText={setDraft}
        placeholder="Your name"
        placeholderTextColor={Palette.faint}
        maxLength={32}
        style={styles.input}
      />
      <PrimaryButton
        testID="profile-save"
        label="Save"
        onPress={() => void setName(draft.trim())}
        disabled={draft.trim().length === 0}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Permissions</Text>
        <Text testID="profile-perm-state" style={styles.cardSub}>
          Bluetooth + location · {permState}
        </Text>
        <Pressable testID="profile-recheck" onPress={recheck} style={styles.linkBtn}>
          <Text style={styles.linkText}>Re-check permissions</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.cardSub}>BreakPoint · v{APP_VERSION}</Text>
        <Text style={styles.cardSub}>The last 100 feet, solved.</Text>
      </View>

      <View style={styles.navWrap}>
        <Navbar active="profile" onSelect={onTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 26, paddingTop: 12 },
  h1: { fontSize: 28, fontWeight: '600', color: Palette.ink, marginTop: 8, fontFamily: Fonts.sans },
  label: { marginTop: 28, fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: Palette.faint, fontFamily: Fonts.sans },
  hint: { fontSize: 14, color: Palette.muted, marginTop: 6, marginBottom: 10, fontFamily: Fonts.sans },
  input: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.hairline,
    backgroundColor: Palette.white,
    paddingHorizontal: 18,
    fontSize: 18,
    color: Palette.ink,
    marginBottom: 14,
    fontFamily: Fonts.sans,
  },
  card: { marginTop: 20, backgroundColor: Palette.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, padding: 18 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  cardSub: { fontSize: 14, color: Palette.muted, marginTop: 6, fontFamily: Fonts.sans },
  linkBtn: { marginTop: 12 },
  linkText: { fontSize: 15, fontWeight: '600', color: Palette.tealInk, fontFamily: Fonts.sans },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
