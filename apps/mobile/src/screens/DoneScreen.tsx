import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette } from '../ui/tokens';

/** Confirm / done — session closed, nothing still sharing. */
export function DoneScreen({ onDone }: { onDone?: () => void }) {
  return (
    <SafeAreaView testID="screen-done" style={styles.root}>
      <View style={styles.body}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <View>
          <Text style={styles.title}>Nice — you found each other.</Text>
          <Text style={styles.copy}>Session closed. Nothing&apos;s still sharing your location.</Text>
        </View>
      </View>
      <PrimaryButton testID="done-home" label="Done" onPress={onDone} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.confirmBg, paddingHorizontal: 30, paddingVertical: 40, justifyContent: 'center', gap: 22 },
  body: { alignItems: 'center', gap: 22 },
  check: { width: 66, height: 66, borderRadius: 33, backgroundColor: Palette.pink, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 30, color: Palette.pinkInk, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: '600', color: Palette.ink, textAlign: 'center', fontFamily: Fonts.sans },
  copy: { fontSize: 16, color: Palette.inkSoft, marginTop: 12, textAlign: 'center', lineHeight: 24, fontFamily: Fonts.sans },
});
