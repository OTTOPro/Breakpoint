import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useProximityConfig } from '../proximity/proximityConfig';

import { DiagnosticsScreen } from './DiagnosticsScreen';

afterEach(cleanup);
beforeEach(() => useProximityConfig.getState().reset());

function inject(r: ReturnType<typeof render>, times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(r.getByTestId('diag-inject'));
}

describe('DiagnosticsScreen', () => {
  it('updates the readouts and draws the sparkline from injected RSSI', () => {
    const r = render(<DiagnosticsScreen />);
    // default inject value is -64
    inject(r, 8);

    expect(r.getByTestId('diag-raw').textContent).toContain('-64');
    expect(r.getByTestId('diag-smoothed').textContent).toContain('-64');
    expect(r.getByTestId('diag-zone').textContent).toBe('very_close');
    expect(r.getByTestId('diag-trend').textContent).toBeTruthy();
    expect(r.getByTestId('diag-lock').textContent).toContain('yes');
    expect(r.getByTestId('diag-tier').textContent).toBe('very_close');

    // Sparkline drew two polylines (raw + smoothed) with real points.
    const lines = r.getAllByTestId('sparkline-line');
    expect(lines.length).toBe(2);
    expect((lines[0].getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
  });

  it('a live tuning control changes the pipeline output for the same signal', () => {
    const r = render(<DiagnosticsScreen />);
    inject(r, 8);
    expect(r.getByTestId('diag-zone').textContent).toBe('very_close');

    // Raise the very_close boundary above -64 → same signal now reads "close".
    fireEvent.click(r.getByTestId('tune-very_close-inc')); // -65 → -63
    expect(r.getByTestId('diag-zone').textContent).toBe('close');
    expect(r.getByTestId('tune-very_close-value').textContent).toBe('-63');
  });

  it('clears the buffer', () => {
    const r = render(<DiagnosticsScreen />);
    inject(r, 3);
    expect(r.getByTestId('diag-raw').textContent).toContain('-64');
    fireEvent.click(r.getByTestId('diag-clear'));
    expect(r.getByTestId('diag-raw').textContent).toBe('—');
  });
});
