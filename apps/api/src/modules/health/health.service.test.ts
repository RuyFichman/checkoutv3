import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports an operational API', () => {
    expect(new HealthService().getHealth()).toMatchObject({ service: 'api', status: 'ok' });
  });
});
