import { registerWebModule, NativeModule } from 'expo';

class BreakpointBleModule extends NativeModule<{}> {
  /** Step 2.0 no-op — web fallback so the JS API resolves everywhere. */
  hello(): string {
    return 'hello from breakpoint-ble (web)';
  }
}

export default registerWebModule(BreakpointBleModule, 'BreakpointBleModule');
