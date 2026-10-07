import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JobQueueService } from './job-queue.service';
import { JobHandlerRegistry } from './job-handler.registry';

@Injectable()
export class JobWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobWorkerService.name);
  private readonly workerId = randomUUID();
  private running = false;

  constructor(
    private readonly queue: JobQueueService,
    private readonly handlers: JobHandlerRegistry,
  ) {}

  async run(queueName: string, pollMs = 1000): Promise<void> {
    if (this.running) {
      throw new Error('Job worker is already running');
    }

    this.running = true;

    while (this.running) {
      const job = await this.queue.claim(queueName, this.workerId);

      if (!job) {
        await this.sleep(pollMs);
        continue;
      }

      try {
        const handler = this.handlers.resolve(job.type);
        await handler.handle(job.payload);
        await this.queue.complete(job.id);
      } catch (error) {
        this.logger.error(
          `Job ${job.id} failed on attempt ${job.attempts}`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.queue.fail(job.id, error);
      }
    }
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
