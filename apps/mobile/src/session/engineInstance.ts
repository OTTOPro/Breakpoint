import { Platform } from 'react-native';

import { SessionEngine } from './engine';

/** App-wide session engine singleton. */
export const engine = new SessionEngine();

// The web build has no Bluetooth. In development, let the browser console feed
// the running session a signal, so the whole Finding flow can be tried with
// two tabs and no phone: call `breakpointSignal(-60)` about once a second.
if (__DEV__ && Platform.OS === 'web') {
  (globalThis as { breakpointSignal?: (rssi: number) => void }).breakpointSignal = (rssi) =>
    engine.injectSignal(rssi, Date.now());
}
