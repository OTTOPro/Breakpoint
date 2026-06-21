import { Platform } from 'react-native';

/**
 * Design tokens lifted from the Claude Design `BreakPoint.dc.html`.
 * Setup palette is monochrome-on-cool; saturated accents live only in Finding
 * (see proximityVisual.ts).
 */
export const Palette = {
  ink: '#212529',
  inkSoft: '#5C636A',
  muted: '#8A9097',
  faint: '#9CA1A7',
  hairline: '#E1E3E6',
  white: '#FFFFFF',
  setupBg: '#E6EDF6',
  surface: '#F5F6F7',
  lavender: '#CECBF6',
  // accents (used sparingly, mostly in Finding / confirm)
  pink: '#ED93B1',
  pinkInk: '#4B1528',
  confirmBg: '#FBEEF3',
  teal: '#C7DBE2',
  tealInk: '#2C4A54',
} as const;

/** Instrument Sans is the intended face; falls back to system on native. */
export const Fonts = {
  sans: Platform.select({ web: 'Instrument Sans, system-ui, sans-serif', default: 'System' }),
  mono: Platform.select({ web: 'Roboto Mono, monospace', default: 'monospace' }),
} as const;

export const Radius = {
  sm: 14,
  md: 18,
  lg: 24,
  pill: 30,
} as const;
