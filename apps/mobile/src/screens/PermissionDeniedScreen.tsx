import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette } from '../ui/tokens';

/**
 * Permission denied — explains WHY proximity needs Bluetooth/location and how
 * to fix it. Finding needs BLE: rather than failing silently, say so and offer
 * the settings shortcut.
 */
export function PermissionDeniedScreen({
  onRetry,
  onBack,
}: {
  onRetry?: () => void;
  onBack?: () => void;
}) {
  const openSettings = () => {
    void Linking.openSettings?.().catch(() => {
      // settings deep link unavailable (e.g. web) — best effort
    });
  };

  return (
    <SafeAreaView testID="screen-permission-denied" style={styles.root}>
      <View style={styles.body}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>✶</Text>
        </View>
        <View>
          <Text testID="permission-denied-title" style={styles.title}>
            BreakPoint needs Bluetooth
          </Text>
          <Text style={styles.copy}>
            The last few feet are found over Bluetooth — without it, we can&apos;t
            guide you to the exact spot. Turn it on in Settings, then come back
            and try again.
          </Text>
        </View>
      </View>
      <PrimaryButton testID="permission-open-settings" label="Open settings" onPress={openSettings} />
      <GhostButton testID="permission-retry" label="Try again" onPress={onRetry} />
      <GhostButton testID="permission-back" label="Not now" onPress={onBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 34 },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  glyph: { width: 64, height: 64, borderRadius: 32, backgroundColor: Palette.teal, alignItems: 'center', justifyContent: 'center' },
  glyphText: { fontSize: 28, color: Palette.tealInk, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: '600', color: Palette.ink, lineHeight: 34, fontFamily: Fonts.sans },
  copy: { fontSize: 16, color: Palette.inkSoft, marginTop: 14, lineHeight: 25, fontFamily: Fonts.sans },
});
