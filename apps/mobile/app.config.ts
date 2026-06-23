import type { ExpoConfig } from "expo/config";

/**
 * BreakPoint mobile config.
 *
 * Bluetooth + location permissions are *declared* here (step 2.0) so the
 * native projects build with the right entitlements, but nothing is requested
 * at runtime yet — that happens once BLE (2.2) and GPS (2.3) are wired.
 */
const config: ExpoConfig = {
  name: "BreakPoint",
  slug: "breakpoint",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "breakpoint",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.breakpoint.app",
    // 1024×1024 PNG, flattened (NO alpha) — App Store requirement.
    icon: "./assets/images/icon.png",
    supportsTablet: false,
    infoPlist: {
      // Bluetooth (connectionless advertise + scan; requested in step 2.2).
      NSBluetoothAlwaysUsageDescription:
        "BreakPoint uses Bluetooth to find the exact spot where you and your contact meet.",
      NSBluetoothPeripheralUsageDescription:
        "BreakPoint uses Bluetooth to find the exact spot where you and your contact meet.",
      // Location (requested in step 2.3).
      NSLocationWhenInUseUsageDescription:
        "BreakPoint uses your location to guide you toward your contact.",
    },
  },
  android: {
    package: "com.breakpoint.app",
    adaptiveIcon: {
      backgroundColor: "#212529",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#212529",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        android: {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
        },
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "BreakPoint uses your location to guide you toward your contact.",
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    // Typed routes require regenerating .expo/types via the dev server; keep
    // off so `tsc` typechecks standalone (routes are plain strings).
    typedRoutes: false,
    reactCompiler: true,
  },
};

export default config;
