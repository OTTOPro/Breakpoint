import type { EventSubscription } from 'expo-modules-core';

import BreakpointBleModule from './src/BreakpointBleModule';
import type {
  PeerSignalEvent,
  ProximityErrorCode,
  ProximityErrorEvent,
} from './src/BreakpointBle.types';

/**
 * Step 2.0 no-op kept for the wiring smoke test. Real proximity is below.
 */
export function hello(): string {
  return BreakpointBleModule.hello();
}

/**
 * Start connectionless BLE proximity for a session. Both phones advertise AND
 * scan the same 128-bit `sessionUuid`; with two participants the only peer
 * picked up is the other phone. Raw RSSI flows back via {@link onPeerSignal}.
 */
export function startProximity(sessionUuid: string): void {
  BreakpointBleModule.startProximity(sessionUuid);
}

/** Stop advertising and scanning. */
export function stopProximity(): void {
  BreakpointBleModule.stopProximity();
}

/**
 * Subscribe to raw peer RSSI samples. Returns a subscription — call
 * `.remove()` to stop listening.
 */
export function onPeerSignal(
  listener: (event: PeerSignalEvent) => void,
): EventSubscription {
  return BreakpointBleModule.addListener('onPeerSignal', listener);
}

/**
 * Subscribe to native failures: Bluetooth off, permission revoked, no BLE
 * advertising on this chipset, or a scan that failed to start.
 */
export function onProximityError(
  listener: (event: ProximityErrorEvent) => void,
): EventSubscription {
  return BreakpointBleModule.addListener('onProximityError', listener);
}

export type { PeerSignalEvent, ProximityErrorCode, ProximityErrorEvent };
export default BreakpointBleModule;
