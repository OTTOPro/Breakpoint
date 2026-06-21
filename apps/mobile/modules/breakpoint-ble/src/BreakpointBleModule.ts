import { NativeModule, requireNativeModule } from 'expo';

declare class BreakpointBleModule extends NativeModule<{}> {
  /** Step 2.0 no-op — proves the native module is callable from JS. */
  hello(): string;
}

export default requireNativeModule<BreakpointBleModule>('BreakpointBle');
