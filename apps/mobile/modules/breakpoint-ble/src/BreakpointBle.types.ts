/** Raw signal sample emitted by the native layer for each peer detection. */
export type PeerSignalEvent = {
  /** Raw RSSI in dBm (negative; closer to 0 = stronger). */
  rssi: number;
  /** Epoch milliseconds when the detection happened. */
  at: number;
};

/** Why the native layer could not advertise or scan. */
export type ProximityErrorCode =
  | 'bluetooth_off'
  | 'unauthorized'
  | 'unsupported'
  | 'advertise_failed'
  | 'scan_failed';

/** Emitted when advertising or scanning cannot start or stops on error. */
export type ProximityErrorEvent = {
  code: ProximityErrorCode;
  /** Platform error code, when there is one (Android callbacks). */
  detail?: number;
};

/** Events surfaced by the native module to JS. */
export type BreakpointBleModuleEvents = {
  onPeerSignal: (event: PeerSignalEvent) => void;
  onProximityError: (event: ProximityErrorEvent) => void;
};
