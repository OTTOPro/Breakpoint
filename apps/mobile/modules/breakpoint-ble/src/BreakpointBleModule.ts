import { NativeModule, requireNativeModule } from 'expo';

import type { BreakpointBleModuleEvents } from './BreakpointBle.types';

declare class BreakpointBleModule extends NativeModule<BreakpointBleModuleEvents> {
  /**
   * Start connectionless proximity: advertise + scan the same 128-bit session
   * UUID. Each peer detection emits an `onPeerSignal` event with raw RSSI.
   */
  startProximity(sessionUuid: string): void;

  /** Stop advertising and scanning. */
  stopProximity(): void;
}

export default requireNativeModule<BreakpointBleModule>('BreakpointBle');
