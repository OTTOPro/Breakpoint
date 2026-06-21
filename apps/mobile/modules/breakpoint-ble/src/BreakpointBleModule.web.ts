import { registerWebModule, NativeModule } from 'expo';

import type { BreakpointBleModuleEvents } from './BreakpointBle.types';

/**
 * Web stub — no-op. There is no BLE on web; this exists so the JS API resolves
 * everywhere and `expo start --web` boots cleanly. Calls do nothing and no
 * `onPeerSignal` events are ever emitted.
 */
class BreakpointBleModule extends NativeModule<BreakpointBleModuleEvents> {
  hello(): string {
    return 'hello from breakpoint-ble (web)';
  }

  startProximity(_sessionUuid: string): void {
    // no-op on web
  }

  stopProximity(): void {
    // no-op on web
  }
}

export default registerWebModule(BreakpointBleModule, 'BreakpointBleModule');
