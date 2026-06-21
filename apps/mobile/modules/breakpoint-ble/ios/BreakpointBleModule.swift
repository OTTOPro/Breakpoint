import ExpoModulesCore

public class BreakpointBleModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BreakpointBle")

    // Step 2.0 no-op. Real CoreBluetooth advertise/scan lands in step 2.2.
    Function("hello") { () -> String in
      return "hello from breakpoint-ble (iOS)"
    }
  }
}
