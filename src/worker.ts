import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JobWorkerService } from './core/jobs/job-worker.service';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule);
  const worker = context.get(JobWorkerService);
  const queue = process.env.AI_WORKER_QUEUE ?? 'default';

  await worker.run(queue);
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
