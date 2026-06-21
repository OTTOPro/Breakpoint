import BreakpointBleModule from './src/BreakpointBleModule';

/**
 * Step 2.0 no-op. Calls the native `hello()` and returns its string, proving
 * the JS ↔ native bridge is wired. Real BLE APIs land in step 2.2.
 */
export function hello(): string {
  return BreakpointBleModule.hello();
}

export default BreakpointBleModule;
