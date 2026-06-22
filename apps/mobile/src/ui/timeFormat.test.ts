import { describe, expect, it } from 'vitest';

import { formatDuration, relativeTime } from './timeFormat';

describe('relativeTime', () => {
  const now = 1_700_000_000_000;
  it('buckets recent times', () => {
    expect(relativeTime(now, now)).toBe('just now');
    expect(relativeTime(now - 30_000, now)).toBe('just now');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(relativeTime(now - 2 * 3_600_000, now)).toBe('2h ago');
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('3d ago');
  });
  it('falls back to a date for old timestamps', () => {
    const old = relativeTime(now - 30 * 86_400_000, now);
    expect(old).not.toMatch(/ago|just now/);
    expect(old.length).toBeGreaterThan(0);
  });
});

describe('formatDuration', () => {
  it('formats seconds / minutes / hours', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(3_600_000 + 5 * 60_000)).toBe('1h 5m');
    expect(formatDuration(2 * 3_600_000)).toBe('2h');
  });
  it('returns null for unknown/negative duration', () => {
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
});
