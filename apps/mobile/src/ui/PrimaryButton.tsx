import { Pressable, StyleSheet, Text } from 'react-native';

import { Fonts, Palette, Radius } from './tokens';

export function PrimaryButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.btn}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: Palette.white, fontSize: 17, fontWeight: '600', fontFamily: Fonts.sans },
  ghost: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ghostLabel: { color: Palette.faint, fontSize: 15, fontWeight: '500', fontFamily: Fonts.sans },
});
