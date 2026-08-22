import type { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';

import { SystemProcessor } from './system.processor';

describe('SystemProcessor', () => {
  it('returns a deterministic job result', async () => {
    const job = { id: 'job_01' } as Job;

    await expect(new SystemProcessor().process(job)).resolves.toEqual({
      jobId: 'job_01',
      status: 'processed',
    });
  });
});
