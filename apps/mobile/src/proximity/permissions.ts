import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Request the permissions BLE proximity needs, at the right moment — call this
 * right before {@link startProximity}, never at app launch.
 *
 * - Android 12+: BLUETOOTH_SCAN + BLUETOOTH_ADVERTISE (scan declared
 *   `neverForLocation`, so location is NOT required for scanning).
 * - Android <12: BLE scanning requires fine location.
 * - iOS: Bluetooth permission is surfaced by the system on first CoreBluetooth
 *   use; we still warm up location here for the GPS tier.
 *
 * Returns true when everything needed was granted.
 */
export async function requestProximityPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return requestAndroidPermissions();
  }

  // iOS / others: ensure location (GPS tier). Bluetooth is prompted by the OS.
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function requestAndroidPermissions(): Promise<boolean> {
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;

  if (apiLevel >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    return Object.values(result).every(
      (s) => s === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  // Pre-12: BLE scan is gated behind fine location.
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
