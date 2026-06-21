import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SessionState } from '@breakpoint/protocol';

import type { ConnectionState } from '../session/store';
import { useSessionStore } from '../session/store';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Fonts, Palette } from '../ui/tokens';

/** Pure copy resolver so failure states are testable without rendering. */
export function failureCopy(input: {
  state?: SessionState;
  connection: ConnectionState;
}): { title: string; body: string } {
  const { state, connection } = input;
  if (state === 'abandoned') {
    return {
      title: 'They stepped away',
      body: 'The other person left the session. Nothing is still sharing your location.',
    };
  }
  if (state === 'expired') {
    return {
      title: 'Session expired',
      body: 'This meet-up timed out. Start a new one when you’re ready.',
    };
  }
  if (state === 'cancelled') {
    return { title: 'Session cancelled', body: 'This invite was called off.' };
  }
  if (connection === 'reconnecting' || connection === 'closed') {
    return {
      title: 'Signal lost',
      body: 'We can’t reach the session right now. Check your connection and try again.',
    };
  }
  return {
    title: 'Something went sideways',
    body: 'The session ended unexpectedly.',
  };
}

/** Failure screen — reads the authoritative store state and explains it. */
export function FailureScreen({ onHome }: { onHome?: () => void }) {
  const state = useSessionStore((s) => s.state);
  const connection = useSessionStore((s) => s.connection);
  const copy = failureCopy({ state, connection });

  return (
    <SafeAreaView testID="screen-failure" style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mark}>
          <Text style={styles.markText}>⚠</Text>
        </View>
        <View>
          <Text testID="failure-title" style={styles.title}>{copy.title}</Text>
          <Text style={styles.copy}>{copy.body}</Text>
        </View>
      </View>
      <PrimaryButton testID="failure-home" label="Back home" onPress={onHome} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 30, paddingVertical: 40 },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  mark: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E7E9EB', alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 28, color: Palette.inkSoft, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  copy: { fontSize: 16, color: Palette.inkSoft, marginTop: 14, lineHeight: 25, fontFamily: Fonts.sans },
});
