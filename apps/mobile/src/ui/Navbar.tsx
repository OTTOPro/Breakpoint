import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette } from './tokens';

/** The bottom nav pill — shown only on Home / History / Contacts / Profile. */
export function Navbar({ active = 'home' }: { active?: 'home' | 'history' | 'contacts' | 'profile' }) {
  const items: { key: typeof active; glyph: string }[] = [
    { key: 'home', glyph: '⌂' },
    { key: 'history', glyph: '↻' },
    { key: 'contacts', glyph: '☆' },
    { key: 'profile', glyph: '◔' },
  ];
  return (
    <View testID="navbar" style={styles.bar}>
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <View key={it.key} style={[styles.item, isActive && styles.itemActive]}>
            <Text style={[styles.glyph, { color: isActive ? Palette.ink : '#7A8088' }]}>
              {it.glyph}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Palette.ink,
    borderRadius: 30,
    padding: 8,
    alignSelf: 'center',
  },
  item: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  itemActive: { backgroundColor: Palette.white },
  glyph: { fontSize: 18, fontFamily: Fonts.sans },
});
