import type { GpsFix } from '@breakpoint/protocol';
import * as Location from 'expo-location';

export * from './geo';

export type GpsWatchHandle = { remove: () => void };

/**
 * Stream GPS fixes via expo-location. Call after permissions are granted.
 * Returns a handle to stop watching.
 */
export async function watchGps(
  onFix: (fix: GpsFix) => void,
  options: Location.LocationOptions = {
    accuracy: Location.Accuracy.High,
    distanceInterval: 1,
    timeInterval: 1_000,
  },
): Promise<GpsWatchHandle> {
  const subscription = await Location.watchPositionAsync(options, (loc) => {
    onFix({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      bearing: loc.coords.heading ?? undefined,
      at: loc.timestamp,
    });
  });
  return { remove: () => subscription.remove() };
}
