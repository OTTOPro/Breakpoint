import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

/** Minimal react-native-safe-area-context stand-in for jsdom tests. */
export function SafeAreaView(props: ViewProps) {
  return <View {...props} />;
}

export function SafeAreaProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export const SafeAreaContext = { Consumer: (props: unknown) => null };
