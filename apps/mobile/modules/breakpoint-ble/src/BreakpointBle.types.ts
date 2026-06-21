/** Raw signal sample emitted by the native layer for each peer detection. */
export type PeerSignalEvent = {
  /** Raw RSSI in dBm (negative; closer to 0 = stronger). */
  rssi: number;
  /** Epoch milliseconds when the detection happened. */
  at: number;
};

/** Events surfaced by the native module to JS. */
export type BreakpointBleModuleEvents = {
  onPeerSignal: (event: PeerSignalEvent) => void;
};
