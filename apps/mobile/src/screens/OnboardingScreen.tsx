import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette } from '../ui/tokens';

/** Onboarding intro — monochrome, calm. The first splash of color is Finding. */
export function OnboardingScreen({ onStart }: { onStart?: () => void }) {
  return (
    <SafeAreaView testID="screen-onboarding" style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mark}>
          <View style={styles.markDot} />
        </View>
        <View>
          <Text style={styles.title}>Meet up without the runaround.</Text>
          <Text style={styles.copy}>
            Two of you, same place, can&apos;t find each other. BreakPoint guides
            you to the exact spot — down to the last few feet. No tracking, no
            feed. One job.
          </Text>
        </View>
      </View>
      <PrimaryButton testID="onboarding-start" label="Get started" onPress={onStart} />
      <Text style={styles.footnote}>Free · works anywhere you both stand</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 34 },
  body: { flex: 1, justifyContent: 'center', gap: 26 },
  mark: { width: 60, height: 60, borderRadius: 18, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  markDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Palette.white },
  title: { fontSize: 34, fontWeight: '600', color: Palette.ink, lineHeight: 38, fontFamily: Fonts.sans },
  copy: { fontSize: 17, color: Palette.inkSoft, marginTop: 16, lineHeight: 26, fontFamily: Fonts.sans },
  footnote: { textAlign: 'center', fontSize: 13, color: Palette.faint, marginTop: 14, fontFamily: Fonts.sans },
});
