package expo.modules.breakpointble

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BreakpointBleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BreakpointBle")

    // Step 2.0 no-op. Real BLE advertise/scan lands in step 2.2.
    Function("hello") {
      "hello from breakpoint-ble (Android)"
    }
  }
}
