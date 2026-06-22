import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildAppJoinLink, parseJoinUrl } from '../session/joinLink';
import { useSessionStore } from '../session/store';
import { Fonts, Palette, Radius } from '../ui/tokens';

/** Origin to build the shareable link on (web → page origin; else app scheme). */
function appOrigin(): string {
  const g = globalThis as { location?: { origin?: string } };
  return g.location?.origin ?? 'breakpoint:/';
}

function copyToClipboard(text: string): void {
  const g = globalThis as {
    navigator?: { clipboard?: { writeText?: (s: string) => Promise<void> } };
  };
  void g.navigator?.clipboard?.writeText?.(text);
}

/**
 * Invite & wait — shows the joinCode + a shareable link (capability kept in the
 * URL fragment) and a waiting state driven by `peerPresent`. Never the bleUuid.
 */
export function InviteScreen({ onClose }: { onClose?: () => void }) {
  const joinCode = useSessionStore((s) => s.joinCode);
  const joinUrl = useSessionStore((s) => s.joinUrl);
  const sessionId = useSessionStore((s) => s.sessionId);
  const peerPresent = useSessionStore((s) => s.peerPresent);
  const [copied, setCopied] = useState(false);

  const display = joinCode ? formatCode(joinCode) : '— — —';
  const capability = joinUrl ? parseJoinUrl(joinUrl)?.capability : undefined;
  const shareLink =
    sessionId && capability
      ? buildAppJoinLink(appOrigin(), sessionId, capability)
      : undefined;

  const onCopy = () => {
    if (!shareLink) return;
    copyToClipboard(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <Text style={styles.lead}>Send the link to the person you&apos;re meeting — or share the code.</Text>
        <View testID="invite-qr" style={styles.qr}>
          <View style={styles.qrInner} />
        </View>
        <View style={styles.codeBlock}>
          <Text testID="invite-code" style={styles.code}>{display}</Text>
        </View>
        {shareLink ? (
          <Text testID="invite-link" numberOfLines={1} style={styles.link}>
            {shareLink}
          </Text>
        ) : null}
      </View>

      <Pressable
        testID="invite-copy"
        onPress={onCopy}
        disabled={!shareLink}
        style={[styles.copyBtn, !shareLink && styles.copyBtnDisabled]}
      >
        <Text style={styles.copyText}>{copied ? 'Link copied ✓' : 'Copy invite link'}</Text>
      </Pressable>

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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  lead: { fontSize: 17, color: Palette.inkSoft, textAlign: 'center', maxWidth: 260, lineHeight: 25, fontFamily: Fonts.sans },
  qr: { width: 200, height: 200, backgroundColor: Palette.white, borderRadius: 28, padding: 22 },
  qrInner: { flex: 1, borderRadius: 8, backgroundColor: '#21252910' },
  codeBlock: { alignItems: 'center', gap: 6 },
  code: { fontFamily: Fonts.mono, fontSize: 30, fontWeight: '600', letterSpacing: 4, color: Palette.ink },
  link: { fontFamily: Fonts.mono, fontSize: 12, color: Palette.muted, maxWidth: 280 },
  copyBtn: { height: 54, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  copyBtnDisabled: { opacity: 0.4 },
  copyText: { fontSize: 16, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 40 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  waitText: { fontSize: 15, color: Palette.muted, fontWeight: '500', fontFamily: Fonts.sans },
});
