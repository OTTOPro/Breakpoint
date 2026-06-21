import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfileStore } from '../local/profileStore';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette, Radius } from '../ui/tokens';

/**
 * Onboarding "name" step — captures the display name into the SAME
 * `profileStore` field that `getSessionLabel()` reads (and Profile edits).
 */
export function NameStepScreen({ onDone }: { onDone?: () => void }) {
  const existing = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const [draft, setDraft] = useState(existing);

  const submit = async () => {
    await setName(draft.trim());
    onDone?.();
  };

  return (
    <SafeAreaView testID="screen-name" style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mark}>
          <View style={styles.markDot} />
        </View>
        <View>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.copy}>
            This is the only thing the other person sees — your label while you
            find each other.
          </Text>
        </View>
        <TextInput
          testID="name-input"
          value={draft}
          onChangeText={setDraft}
          placeholder="Your name"
          placeholderTextColor={Palette.faint}
          autoFocus
          style={styles.input}
        />
      </View>
      <PrimaryButton
        testID="name-continue"
        label="Continue"
        onPress={() => void submit()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 34 },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  mark: { width: 60, height: 60, borderRadius: 18, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  markDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Palette.white },
  title: { fontSize: 30, fontWeight: '600', color: Palette.ink, lineHeight: 34, fontFamily: Fonts.sans },
  copy: { fontSize: 16, color: Palette.inkSoft, marginTop: 14, lineHeight: 25, fontFamily: Fonts.sans },
  input: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.hairline,
    backgroundColor: Palette.white,
    paddingHorizontal: 18,
    fontSize: 18,
    color: Palette.ink,
    fontFamily: Fonts.sans,
  },
});
