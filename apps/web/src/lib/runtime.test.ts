import { describe, expect, it } from 'vitest';

import { getWebRuntimeSummary } from './runtime';

describe('web runtime summary', () => {
  it('identifies a healthy web service', () => {
    expect(getWebRuntimeSummary()).toMatchObject({ service: 'web', status: 'ok' });
  });
});
