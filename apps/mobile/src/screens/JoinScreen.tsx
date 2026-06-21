import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette, Radius } from '../ui/tokens';

const CODE_LENGTH = 6;
const VALID_CODE = /^[A-Z2-9]{6}$/; // unambiguous alphabet, 6 chars

/** Join — enter a code (or scan). Navigation/join handled by the route. */
export function JoinScreen({
  onClose,
  onJoin,
  pending = false,
  errorMessage,
}: {
  onClose?: () => void;
  onJoin?: (code: string) => void;
  pending?: boolean;
  errorMessage?: string;
}) {
  const [code, setCode] = useState('');
  const valid = VALID_CODE.test(code);
  const showInvalid = code.length === CODE_LENGTH && !valid;
  const canSubmit = valid && !pending;
  return (
    <SafeAreaView testID="screen-join" style={styles.root}>
      <View style={styles.topbar}>
        <Pressable testID="join-close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.heading}>Join</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <View>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.sub}>It&apos;s on their screen, under the QR.</Text>
        </View>

        <TextInput
          testID="join-input"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="K7P2QX"
          placeholderTextColor={Palette.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          style={[styles.input, showInvalid && styles.inputInvalid]}
        />
        {showInvalid ? (
          <Text testID="join-invalid" style={styles.invalid}>
            Codes are 6 characters (letters and numbers).
          </Text>
        ) : null}
        {errorMessage ? (
          <Text testID="join-error" style={styles.invalid}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.orRow}>
          <View style={styles.hr} />
          <Text style={styles.or}>or</Text>
          <View style={styles.hr} />
        </View>

        <Pressable testID="join-scan" style={styles.scan}>
          <Text style={styles.scanText}>⎙ Scan a QR</Text>
        </Pressable>
      </View>

      <PrimaryButton
        testID="join-submit"
        label={pending ? 'Joining…' : 'Join'}
        onPress={canSubmit ? () => onJoin?.(code) : undefined}
        disabled={!canSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 28 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 30 },
  closeText: { fontSize: 23, color: Palette.ink, fontFamily: Fonts.sans },
  heading: { fontSize: 17, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  spacer: { width: 30 },
  body: { flex: 1, justifyContent: 'center', gap: 26 },
  title: { fontSize: 26, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  sub: { fontSize: 15, color: Palette.muted, marginTop: 8, fontFamily: Fonts.sans },
  input: {
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.ink,
    backgroundColor: Palette.white,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: 26,
    letterSpacing: 6,
    color: Palette.ink,
  },
  inputInvalid: { borderColor: '#C0566E' },
  invalid: { fontSize: 14, color: '#72243E', marginTop: 10, fontFamily: Fonts.sans },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hr: { flex: 1, height: 1, backgroundColor: Palette.lavender },
  or: { fontSize: 14, color: Palette.faint, fontFamily: Fonts.sans },
  scan: { height: 60, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, backgroundColor: Palette.white, alignItems: 'center', justifyContent: 'center' },
  scanText: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
});
