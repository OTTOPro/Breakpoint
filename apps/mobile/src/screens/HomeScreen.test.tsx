import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomeScreen } from './HomeScreen';

afterEach(cleanup);

describe('HomeScreen — loading & error states', () => {
  it('shows a loading state and blocks double-submit while pending', () => {
    const onFind = vi.fn();
    const r = render(<HomeScreen onFind={onFind} pending />);

    expect(r.getByTestId('home-pending')).toBeTruthy();
    expect(r.getByText('Starting…')).toBeTruthy();

    fireEvent.click(r.getByTestId('home-find'));
    expect(onFind).not.toHaveBeenCalled(); // disabled → no double submit
  });

  it('fires onFind when idle', () => {
    const onFind = vi.fn();
    const r = render(<HomeScreen onFind={onFind} />);
    fireEvent.click(r.getByTestId('home-find'));
    expect(onFind).toHaveBeenCalledOnce();
  });

  it('renders an error banner with a retry affordance', () => {
    const onFind = vi.fn();
    const r = render(
      <HomeScreen onFind={onFind} errorMessage="Can't reach BreakPoint." />,
    );
    expect(r.getByTestId('home-error')).toBeTruthy();
    expect(r.getByText("Can't reach BreakPoint.")).toBeTruthy();
    fireEvent.click(r.getByTestId('home-error'));
    expect(onFind).toHaveBeenCalledOnce(); // tap to retry
  });
});
