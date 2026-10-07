import { Global, Module } from '@nestjs/common';
import { JobHandlerRegistry } from './job-handler.registry';
import { JobQueueService } from './job-queue.service';
import { JobWorkerService } from './job-worker.service';

@Global()
@Module({
  providers: [JobHandlerRegistry, JobQueueService, JobWorkerService],
  exports: [JobHandlerRegistry, JobQueueService, JobWorkerService],
})
export class JobQueueModule {}
