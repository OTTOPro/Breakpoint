import Svg, { Polyline } from 'react-native-svg';

import { Palette } from './tokens';

export interface SparklineScale {
  width: number;
  height: number;
  min: number;
  max: number;
}

/** Pure: map a value series to an SVG polyline `points` string. */
export function toPolylinePoints(
  values: readonly number[],
  { width, height, min, max }: SparklineScale,
): string {
  if (values.length === 0) return '';
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const clamped = Math.max(min, Math.min(max, v));
      const y = height - ((clamped - min) / span) * height;
      const x = i * stepX;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Tiny hand-rolled sparkline — raw (light) + smoothed (dark) overlaid. A plain
 * SVG; no charting library (ponytail).
 */
export function Sparkline({
  raw,
  smoothed,
  width = 300,
  height = 80,
  min = -100,
  max = -30,
  testID = 'diag-sparkline',
}: {
  raw: readonly number[];
  smoothed: readonly number[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  testID?: string;
}) {
  const scale: SparklineScale = { width, height, min, max };
  return (
    <Svg testID={testID} width={width} height={height}>
      <Polyline
        points={toPolylinePoints(raw, scale)}
        fill="none"
        stroke={Palette.faint}
        strokeWidth={1.5}
      />
      <Polyline
        points={toPolylinePoints(smoothed, scale)}
        fill="none"
        stroke={Palette.ink}
        strokeWidth={2}
      />
    </Svg>
  );
}
