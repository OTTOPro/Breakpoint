/** Pure time formatting for the history list. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "just now" / "5m ago" / "2h ago" / "3d ago" / a date for older. */
export function relativeTime(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 0) return 'just now';
  if (diff < MIN) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** "45s" / "12 min" / "1h 5m". Returns null for unknown duration. */
export function formatDuration(ms?: number): string | null {
  if (ms == null || ms < 0) return null;
  if (ms < MIN) return `${Math.round(ms / 1000)}s`;
  if (ms < HOUR) return `${Math.round(ms / MIN)} min`;
  const h = Math.floor(ms / HOUR);
  const m = Math.round((ms % HOUR) / MIN);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
