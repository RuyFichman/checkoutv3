import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

@Processor('system')
export class SystemProcessor extends WorkerHost {
  override async process(job: Job): Promise<{ jobId: string; status: 'processed' }> {
    return {
      jobId: String(job.id ?? 'unknown'),
      status: 'processed',
    };
  }
}
