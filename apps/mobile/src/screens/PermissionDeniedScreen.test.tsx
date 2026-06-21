import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PermissionDeniedScreen } from './PermissionDeniedScreen';

afterEach(cleanup);

describe('PermissionDeniedScreen', () => {
  it('explains why and offers settings + retry (no silent failure)', () => {
    const onRetry = vi.fn();
    const r = render(<PermissionDeniedScreen onRetry={onRetry} />);

    expect(r.getByTestId('permission-denied-title').textContent).toContain('Bluetooth');
    expect(r.getAllByText(/Bluetooth/).length).toBeGreaterThan(0);
    expect(r.getByTestId('permission-open-settings')).toBeTruthy();

    fireEvent.click(r.getByTestId('permission-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
