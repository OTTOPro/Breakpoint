import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useContactsStore, type Contact } from '../local/contactsStore';
import { Navbar, type TabKey } from '../ui/Navbar';
import { Fonts, Palette, Radius } from '../ui/tokens';

/**
 * Contacts — a local list of saved peer labels (matches Home's "Recents").
 * Stub only: there is NO peer addressing — tapping just pre-fills a label in a
 * new session (cosmetic). Direct re-invite is a V2 feature.
 */
export function ContactsScreen({
  onTab,
  onPick,
}: {
  onTab?: (tab: TabKey) => void;
  onPick?: (label: string) => void;
}) {
  const contacts = useContactsStore((s) => s.contacts);
  const hydrate = useContactsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaView testID="screen-contacts" style={styles.root}>
      <Text style={styles.h1}>Contacts</Text>
      <Text style={styles.note}>Direct re-invite is coming in a later version.</Text>

      {contacts.length === 0 ? (
        <View testID="contacts-empty" style={styles.empty}>
          <Text style={styles.emptyText}>No saved contacts yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {contacts.map((c: Contact) => (
            <Pressable
              key={c.id}
              testID="contacts-item"
              onPress={() => onPick?.(c.label)}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.label.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.rowTitle}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.navWrap}>
        <Navbar active="contacts" onSelect={onTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 26, paddingTop: 12 },
  h1: { fontSize: 28, fontWeight: '600', color: Palette.ink, marginTop: 8, fontFamily: Fonts.sans },
  note: { fontSize: 14, color: Palette.muted, marginTop: 6, marginBottom: 16, fontFamily: Fonts.sans },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Palette.muted, fontFamily: Fonts.sans },
  list: { gap: 12, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Palette.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '600', color: Palette.inkSoft, fontFamily: Fonts.sans },
  rowTitle: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
});
