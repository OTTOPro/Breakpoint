import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette } from '../ui/tokens';

export interface PermissionScreenProps {
  testID?: string;
  glyph: string;
  glyphBg: string;
  glyphColor: string;
  title: string;
  body: string;
  primaryLabel: string;
  onAllow?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
}

/**
 * Permission ask — calm, monochrome setup. Asked at the right moment (just
 * before it's needed), with a clear explanation.
 */
export function PermissionScreen(props: PermissionScreenProps) {
  return (
    <SafeAreaView testID={props.testID} style={styles.root}>
      <Pressable testID="permission-back" onPress={props.onBack} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <View style={[styles.glyph, { backgroundColor: props.glyphBg }]}>
          <Text style={[styles.glyphText, { color: props.glyphColor }]}>{props.glyph}</Text>
        </View>
        <View>
          <Text style={styles.title}>{props.title}</Text>
          <Text style={styles.copy}>{props.body}</Text>
        </View>
      </View>
      <PrimaryButton testID="permission-allow" label={props.primaryLabel} onPress={props.onAllow} />
      <GhostButton testID="permission-skip" label="Not now" onPress={props.onSkip} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 34 },
  back: { width: 30 },
  backText: { fontSize: 24, color: Palette.ink, fontFamily: Fonts.sans },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  glyph: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  glyphText: { fontSize: 28, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: '600', color: Palette.ink, lineHeight: 34, fontFamily: Fonts.sans },
  copy: { fontSize: 16, color: Palette.inkSoft, marginTop: 14, lineHeight: 25, fontFamily: Fonts.sans },
});
