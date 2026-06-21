import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette } from './tokens';

export type TabKey = 'home' | 'history' | 'contacts' | 'profile';

/** The bottom nav pill — shown only on Home / History / Contacts / Profile. */
export function Navbar({
  active = 'home',
  onSelect,
}: {
  active?: TabKey;
  onSelect?: (tab: TabKey) => void;
}) {
  const items: { key: TabKey; glyph: string }[] = [
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
          <Pressable
            key={it.key}
            testID={`navtab-${it.key}`}
            onPress={() => onSelect?.(it.key)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Text style={[styles.glyph, { color: isActive ? Palette.ink : '#7A8088' }]}>
              {it.glyph}
            </Text>
          </Pressable>
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
