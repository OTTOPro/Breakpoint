import { StyleSheet, Text, View, Pressable } from 'react-native';

import { haversineDistance } from '../location/geo';
import { useSessionStore } from '../session/store';
import { findingVisual } from '../ui/proximityVisual';
import { Fonts } from '../ui/tokens';

export interface FindingScreenProps {
  onExit?: () => void;
  onFound?: () => void;
}

/**
 * Finding — the live core. Full focus, NO navbar. Reads `tier`,
 * `proximity` (zone/trend/rssiSmoothed) and `peerGps` from the store and
 * re-renders as the physics change. The cold→warm accent is driven by the
 * real-time proximity value, continuously and in both directions.
 */
export function FindingScreen({ onExit, onFound }: FindingScreenProps) {
  const tier = useSessionStore((s) => s.tier);
  const reading = useSessionStore((s) => s.proximity);
  const myGps = useSessionStore((s) => s.myGps);
  const peerGps = useSessionStore((s) => s.peerGps);

  const v = findingVisual({ tier, reading });

  const distanceM =
    myGps && peerGps ? haversineDistance(myGps, peerGps) : undefined;
  const metersText =
    distanceM !== undefined ? `≈ ${Math.round(distanceM)} m` : null;

  return (
    <View
      testID="finding-screen"
      style={[styles.root, { backgroundColor: v.accent }]}
    >
      {/* Live accent value, surfaced for state-driven tests + debugging. */}
      <Text
        testID="finding-accent"
        accessibilityLabel={`accent ${v.accent}`}
        style={styles.accentProbe}
      >
        {v.accent}
      </Text>

      <View style={styles.header}>
        <Pressable testID="finding-exit" onPress={onExit} style={styles.exit}>
          <Text style={[styles.exitText, { color: v.ink }]}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {v.showRadar && (
          <View testID="finding-radar" style={styles.radarWrap}>
            <View style={[styles.ring, { borderColor: v.ink, opacity: 0.32 }]} />
            <View style={[styles.ring, styles.ringInner, { borderColor: v.ink, opacity: 0.5 }]} />
            <View style={[styles.dot, { backgroundColor: v.ink }]} />
          </View>
        )}

        {v.showArrow && (
          <View
            testID="finding-arrow"
            style={[styles.arrow, { transform: [{ rotate: '0deg' }] }]}
          >
            <Text style={[styles.arrowGlyph, { color: v.ink }]}>▲</Text>
          </View>
        )}

        {v.showMeters && metersText && (
          <Text testID="finding-meters" style={[styles.meters, { color: v.ink }]}>
            {metersText}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text testID="finding-title" style={[styles.title, { color: v.ink }]}>
          {v.title}
        </Text>
        <Text style={[styles.sub, { color: v.ink }]}>{v.sub}</Text>
      </View>

      {v.isHere && (
        <View testID="finding-social" style={styles.socialOverlay}>
          <Text style={[styles.socialTitle, { color: v.ink }]}>You’re here.</Text>
          <Text style={[styles.socialSub, { color: v.ink }]}>
            Look up — wave your phones. They’re right by you.
          </Text>
          <Pressable
            testID="finding-found"
            onPress={onFound}
            style={[styles.foundBtn, { backgroundColor: v.ink }]}
          >
            <Text style={styles.foundBtnText}>We found each other</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  accentProbe: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, fontSize: 1 },
  header: {
    marginTop: 56,
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 30,
  },
  exit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: { fontSize: 18, fontFamily: Fonts.sans },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  radarWrap: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  ring: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 2 },
  ringInner: { width: 190, height: 190, borderRadius: 95 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  arrow: {},
  arrowGlyph: { fontSize: 130, fontFamily: Fonts.sans },
  meters: { position: 'absolute', bottom: 46, fontSize: 56, fontWeight: '600', fontFamily: Fonts.sans },
  footer: { width: '100%', paddingHorizontal: 30, paddingBottom: 70, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: Fonts.sans },
  sub: { fontSize: 15, opacity: 0.7, marginTop: 7, fontFamily: Fonts.sans },
  socialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  socialTitle: { fontSize: 46, fontWeight: '600', fontFamily: Fonts.sans, textAlign: 'center' },
  socialSub: { fontSize: 18, opacity: 0.78, marginTop: 16, textAlign: 'center', fontFamily: Fonts.sans },
  foundBtn: { marginTop: 46, height: 58, paddingHorizontal: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  foundBtnText: { color: '#fff', fontSize: 17, fontWeight: '600', fontFamily: Fonts.sans },
});
