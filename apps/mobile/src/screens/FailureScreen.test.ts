import { describe, expect, it } from 'vitest';

import { failureCopy } from './FailureScreen';

describe('failureCopy — every failure has a clear message', () => {
  it('maps abandoned / expired / cancelled', () => {
    expect(failureCopy({ state: 'abandoned', connection: 'open' }).title).toMatch(/stepped away/i);
    expect(failureCopy({ state: 'expired', connection: 'open' }).title).toMatch(/expired/i);
    expect(failureCopy({ state: 'cancelled', connection: 'open' }).title).toMatch(/cancelled/i);
  });

  it('maps a lost connection (WS reconnections exhausted) to a clear state', () => {
    const copy = failureCopy({ state: 'active_gps', connection: 'closed' });
    expect(copy.title).toMatch(/signal lost/i);
    expect(copy.body.length).toBeGreaterThan(0);
  });

  it('always returns a non-empty title/body', () => {
    const copy = failureCopy({ connection: 'open' });
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
  });
});
