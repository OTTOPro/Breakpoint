import { View, type ViewProps } from 'react-native';

/** Minimal react-native-svg stand-in for jsdom tests (passthrough Views). */
export default function Svg(props: ViewProps) {
  return <View {...props} />;
}

export function Polyline(props: { points?: string }) {
  return <View testID="sparkline-line" accessibilityLabel={props.points} />;
}

export function Path(props: ViewProps) {
  return <View {...props} />;
}

export function Line(props: ViewProps) {
  return <View {...props} />;
}
