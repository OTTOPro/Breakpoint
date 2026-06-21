/**
 * BLE helpers (step 2.0 stub).
 *
 * The real UUID derivation (from the session token) lands later. For now this
 * is a pure formatting stub so callers can wire against the signature.
 */

/**
 * Format 16 raw bytes as a canonical lowercase UUID string
 * (8-4-4-4-12). Returns an empty string if the input is not 16 bytes.
 */
export function formatBleUuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) return "";
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
