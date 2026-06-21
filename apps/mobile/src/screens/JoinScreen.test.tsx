import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JoinScreen } from './JoinScreen';

afterEach(cleanup);

const type = (r: ReturnType<typeof render>, value: string) =>
  fireEvent.change(r.getByTestId('join-input'), { target: { value } });

describe('JoinScreen — code validation & states', () => {
  it('disables Join and shows feedback for an invalid code', () => {
    const onJoin = vi.fn();
    const r = render(<JoinScreen onJoin={onJoin} />);

    type(r, 'ABCDE1'); // "1" is excluded (ambiguous alphabet) → invalid
    expect(r.getByTestId('join-invalid')).toBeTruthy();
    fireEvent.click(r.getByTestId('join-submit'));
    expect(onJoin).not.toHaveBeenCalled();
    expect(r.getByTestId('join-submit').getAttribute('aria-disabled')).toBe('true');
  });

  it('enables Join for a valid 6-char code and submits it', () => {
    const onJoin = vi.fn();
    const r = render(<JoinScreen onJoin={onJoin} />);

    type(r, 'K7P2QX');
    expect(r.queryByTestId('join-invalid')).toBeNull();
    fireEvent.click(r.getByTestId('join-submit'));
    expect(onJoin).toHaveBeenCalledWith('K7P2QX');
  });

  it('shows pending + error states without hanging', () => {
    const r = render(<JoinScreen pending errorMessage="That session is already full." />);
    expect(r.getByText('Joining…')).toBeTruthy();
    expect(r.getByTestId('join-error')).toBeTruthy();
    expect(r.getByText('That session is already full.')).toBeTruthy();
  });
});
