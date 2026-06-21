import ExpoModulesCore
import CoreBluetooth

/**
 * BreakpointBle — iOS proximity via CoreBluetooth.
 *
 * Connectionless: the phone BOTH advertises the session UUID as a service and
 * scans for that same service UUID. With two participants the only match is the
 * other phone. The native layer stays dumb — it emits raw `{ rssi, at }` and
 * does no zone/trend logic (that lives in JS).
 */
public class BreakpointBleModule: Module {
  private let proximity = ProximityManager()

  public func definition() -> ModuleDefinition {
    Name("BreakpointBle")

    Events("onPeerSignal")

    Function("hello") { () -> String in
      "hello from breakpoint-ble (iOS)"
    }

    Function("startProximity") { (sessionUuid: String) in
      self.proximity.onSignal = { [weak self] rssi, at in
        self?.sendEvent("onPeerSignal", [
          "rssi": rssi,
          "at": at,
        ])
      }
      self.proximity.start(sessionUuid: sessionUuid)
    }

    Function("stopProximity") {
      self.proximity.stop()
    }

    OnDestroy {
      self.proximity.stop()
    }
  }
}

/// Owns the CoreBluetooth managers and surfaces raw RSSI via a callback.
final class ProximityManager: NSObject, CBCentralManagerDelegate, CBPeripheralManagerDelegate {
  /// (rssi, epochMillis)
  var onSignal: ((Int, Double) -> Void)?

  private var central: CBCentralManager?
  private var peripheral: CBPeripheralManager?
  private var serviceUuid: CBUUID?
  private var running = false

  func start(sessionUuid: String) {
    serviceUuid = CBUUID(string: sessionUuid)
    running = true
    if central == nil {
      central = CBCentralManager(delegate: self, queue: nil)
    }
    if peripheral == nil {
      peripheral = CBPeripheralManager(delegate: self, queue: nil)
    }
    startScanIfReady()
    startAdvertiseIfReady()
  }

  func stop() {
    running = false
    central?.stopScan()
    peripheral?.stopAdvertising()
  }

  private func startScanIfReady() {
    guard running,
          let central = central,
          central.state == .poweredOn,
          let uuid = serviceUuid else { return }
    // Explicit service UUID → works foreground AND background on iOS↔iOS.
    central.scanForPeripherals(
      withServices: [uuid],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
    )
  }

  private func startAdvertiseIfReady() {
    guard running,
          let peripheral = peripheral,
          peripheral.state == .poweredOn,
          let uuid = serviceUuid else { return }
    // Service UUID only — iOS forbids custom service/manufacturer payloads.
    peripheral.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [uuid]
    ])
  }

  // MARK: - CBCentralManagerDelegate

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      startScanIfReady()
    default:
      break // poweredOff / unauthorized / unsupported — nothing to scan
    }
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    let at = Date().timeIntervalSince1970 * 1000.0
    onSignal?(RSSI.intValue, at)
  }

  // MARK: - CBPeripheralManagerDelegate

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      startAdvertiseIfReady()
    default:
      break
    }
  }
}
