import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProximityConfig } from '../proximity/proximityConfig';
import type { RssiSample } from '../proximity/smoothing';
import { ProximityPipeline } from '../session/proximityPipeline';
import { Sparkline } from '../ui/Sparkline';
import { Fonts, Palette, Radius } from '../ui/tokens';

const STEP_MS = 150;
const MAX_SAMPLES = 80;

function Stepper({
  testID,
  label,
  value,
  onDec,
  onInc,
}: {
  testID: string;
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.tuneRow}>
      <Text style={styles.tuneLabel}>{label}</Text>
      <Pressable testID={`${testID}-dec`} onPress={onDec} style={styles.stepBtn}>
        <Text style={styles.stepGlyph}>−</Text>
      </Pressable>
      <Text testID={`${testID}-value`} style={styles.tuneValue}>{value}</Text>
      <Pressable testID={`${testID}-inc`} onPress={onInc} style={styles.stepBtn}>
        <Text style={styles.stepGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

/**
 * Proximity diagnostics — a DEV tool. It drives the SAME {@link ProximityPipeline}
 * the app uses (no parallel logic): inject RSSI, watch raw/smoothed/zone/trend/
 * lock/tier, see the sparkline, and tune `proximityConfig` live.
 */
export function DiagnosticsScreen({ onClose }: { onClose?: () => void }) {
  const config = useProximityConfig((s) => s.config);
  const setConfig = useProximityConfig((s) => s.set);
  const setThreshold = useProximityConfig((s) => s.setThreshold);
  const resetConfig = useProximityConfig((s) => s.reset);

  const [history, setHistory] = useState<RssiSample[]>([]);
  const [draft, setDraft] = useState('-64');
  const atRef = useRef(0);

  // Replay the buffered raw signal through a fresh pipeline using the CURRENT
  // config on every render — so tuning re-evaluates the same signal instantly.
  // (Cheap: history is capped. `config` below makes renders track tuning.)
  const pipe = new ProximityPipeline();
  const snapshots = history.map((s) => pipe.push(s));

  const latest = snapshots[snapshots.length - 1];
  const rawSeries = history.map((s) => s.rssi);
  const smoothSeries = snapshots.map((s) => s.rssiSmoothed);

  const inject = (rssi: number) => {
    atRef.current += STEP_MS;
    setHistory((prev) => [...prev, { rssi, at: atRef.current }].slice(-MAX_SAMPLES));
  };

  const injectDraft = () => {
    const v = Number(draft);
    if (Number.isFinite(v)) inject(v);
  };

  const clear = () => {
    atRef.current = 0;
    setHistory([]);
  };

  const tz = config.zoneThresholds;

  return (
    <SafeAreaView testID="screen-diagnostics" style={styles.root}>
      <View style={styles.topbar}>
        <Pressable testID="diag-close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>‹</Text>
        </Pressable>
        <Text style={styles.heading}>Proximity diagnostics</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Readouts */}
        <View style={styles.card}>
          <Readout testID="diag-raw" label="RSSI (raw)" value={latest ? `${latest.raw} dBm` : '—'} />
          <Readout testID="diag-smoothed" label="RSSI (smoothed)" value={latest ? `${latest.rssiSmoothed.toFixed(1)} dBm` : '—'} />
          <Readout testID="diag-zone" label="Zone" value={latest ? latest.zone : '—'} />
          <Readout testID="diag-trend" label="Trend" value={latest ? latest.trend : '—'} />
          <Readout
            testID="diag-lock"
            label="BLE lock"
            value={latest ? `${latest.locked ? 'yes' : 'no'} (${latest.lockCount} in window)` : '—'}
          />
          <Readout testID="diag-tier" label="Tier" value={latest ? latest.tier : '—'} />
        </View>

        {/* Sparkline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signal (raw vs smoothed)</Text>
          <Sparkline raw={rawSeries} smoothed={smoothSeries} width={300} height={80} />
        </View>

        {/* Injection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inject signal</Text>
          <View style={styles.injectRow}>
            <TextInput
              testID="diag-inject-input"
              value={draft}
              onChangeText={setDraft}
              keyboardType="numbers-and-punctuation"
              style={styles.injectInput}
            />
            <Pressable testID="diag-inject" onPress={injectDraft} style={styles.injectBtn}>
              <Text style={styles.injectBtnText}>Inject</Text>
            </Pressable>
            <Pressable testID="diag-clear" onPress={clear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Tuning */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tuning (live)</Text>
          <Stepper testID="tune-social" label="zone ≥ social (dBm)" value={`${tz.social}`} onDec={() => setThreshold('social', tz.social - 2)} onInc={() => setThreshold('social', tz.social + 2)} />
          <Stepper testID="tune-very_close" label="zone ≥ very_close (dBm)" value={`${tz.very_close}`} onDec={() => setThreshold('very_close', tz.very_close - 2)} onInc={() => setThreshold('very_close', tz.very_close + 2)} />
          <Stepper testID="tune-close" label="zone ≥ close (dBm)" value={`${tz.close}`} onDec={() => setThreshold('close', tz.close - 2)} onInc={() => setThreshold('close', tz.close + 2)} />
          <Stepper testID="tune-alpha" label="EMA alpha" value={config.alpha.toFixed(2)} onDec={() => setConfig({ alpha: Math.max(0.05, +(config.alpha - 0.05).toFixed(2)) })} onInc={() => setConfig({ alpha: Math.min(1, +(config.alpha + 0.05).toFixed(2)) })} />
          <Stepper testID="tune-lockSamples" label="lock samples (N)" value={`${config.lockSamples}`} onDec={() => setConfig({ lockSamples: Math.max(1, config.lockSamples - 1) })} onInc={() => setConfig({ lockSamples: config.lockSamples + 1 })} />
          <Stepper testID="tune-graceMs" label="grace (ms)" value={`${config.graceMs}`} onDec={() => setConfig({ graceMs: Math.max(0, config.graceMs - 500) })} onInc={() => setConfig({ graceMs: config.graceMs + 500 })} />
          <Pressable testID="tune-reset" onPress={resetConfig} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset to defaults</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Readout({ testID, label, value }: { testID: string; label: string; value: string }) {
  return (
    <View style={styles.readoutRow}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text testID={testID} style={styles.readoutValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.setupBg, paddingHorizontal: 20, paddingTop: 12 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  close: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  closeText: { fontSize: 28, color: Palette.ink, fontFamily: Fonts.sans },
  heading: { fontSize: 17, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.sans },
  spacer: { width: 44 },
  scroll: { gap: 14, paddingBottom: 40 },
  card: { backgroundColor: Palette.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.hairline, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: Palette.faint, marginBottom: 12, fontFamily: Fonts.sans },
  readoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  readoutLabel: { fontSize: 15, color: Palette.inkSoft, fontFamily: Fonts.sans },
  readoutValue: { fontSize: 15, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.mono },
  injectRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  injectInput: { flex: 1, height: 48, borderRadius: Radius.sm, borderWidth: 1, borderColor: Palette.hairline, paddingHorizontal: 14, fontSize: 16, fontFamily: Fonts.mono, color: Palette.ink },
  injectBtn: { height: 48, paddingHorizontal: 18, borderRadius: Radius.sm, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  injectBtnText: { color: Palette.white, fontWeight: '600', fontFamily: Fonts.sans },
  clearBtn: { height: 48, paddingHorizontal: 14, borderRadius: Radius.sm, borderWidth: 1, borderColor: Palette.hairline, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { color: Palette.ink, fontWeight: '600', fontFamily: Fonts.sans },
  tuneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tuneLabel: { flex: 1, fontSize: 14, color: Palette.inkSoft, fontFamily: Fonts.sans },
  tuneValue: { width: 64, textAlign: 'center', fontSize: 15, fontWeight: '600', color: Palette.ink, fontFamily: Fonts.mono },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Palette.hairline, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 20, color: Palette.ink, fontFamily: Fonts.sans },
  resetBtn: { marginTop: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontSize: 15, fontWeight: '600', color: Palette.tealInk, fontFamily: Fonts.sans },
});
