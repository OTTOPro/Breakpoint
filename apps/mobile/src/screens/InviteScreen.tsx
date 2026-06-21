import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionStore } from '../session/store';
import { Fonts, Palette, Radius } from '../ui/tokens';

/**
 * Invite & wait — shows the joinCode (from createSession, in the store) and a
 * waiting state driven by `peerPresent`. Never shows the bleUuid.
 */
export function InviteScreen({ onClose }: { onClose?: () => void }) {
  const joinCode = useSessionStore((s) => s.joinCode);
  const peerPresent = useSessionStore((s) => s.peerPresent);

  const display = joinCode ? formatCode(joinCode) : '— — —';

  return (
    <SafeAreaView testID="screen-invite" style={styles.root}>
      <View style={styles.topbar}>
        <Pressable testID="invite-close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.heading}>Invite</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.lead}>Show this to the person you&apos;re meeting — or send the code.</Text>
        <View testID="invite-qr" style={styles.qr}>
          <View style={styles.qrInner} />
        </View>
        <View style={styles.codeBlock}>
          <Text testID="invite-code" style={styles.code}>{display}</Text>
          <Text style={styles.codeHint}>tap to copy</Text>
        </View>
      </View>

      <View testID="invite-status" style={styles.waitRow}>
        <View style={[styles.dot, { backgroundColor: peerPresent ? Palette.pink : Palette.ink }]} />
        <Text style={styles.waitText}>
          {peerPresent ? 'they’re here — starting…' : 'waiting for someone…'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function formatCode(code: string): string {
  const c = code.toUpperCase();
  return c.length >= 6 ? `${c.slice(0, 3)}-${c.slice(3, 6)}` : c;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 28 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 30 },
  closeText: { fontSize: 23, color: Palette.ink, fontFamily: Fonts.sans },
  heading: { fontSize: 17, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  spacer: { width: 30 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  lead: { fontSize: 17, color: Palette.inkSoft, textAlign: 'center', maxWidth: 240, lineHeight: 25, fontFamily: Fonts.sans },
  qr: { width: 212, height: 212, backgroundColor: Palette.white, borderRadius: 28, padding: 22 },
  qrInner: { flex: 1, borderRadius: 8, backgroundColor: '#21252910' },
  codeBlock: { alignItems: 'center', gap: 6 },
  code: { fontFamily: Fonts.mono, fontSize: 30, fontWeight: '600', letterSpacing: 4, color: Palette.ink },
  codeHint: { fontSize: 13, color: Palette.faint, fontFamily: Fonts.sans },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 40 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  waitText: { fontSize: 15, color: Palette.muted, fontWeight: '500', fontFamily: Fonts.sans },
});
