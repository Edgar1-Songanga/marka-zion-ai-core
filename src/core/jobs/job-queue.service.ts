import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

export interface JobRecord {
  readonly id: string;
  readonly queue: string;
  readonly type: string;
  readonly payload: unknown;
  readonly attempts: number;
  readonly maxAttempts: number;
}

interface JobRow {
  readonly id: string;
  readonly queue: string;
  readonly type: string;
  readonly payload: unknown;
  readonly attempts: number;
  readonly max_attempts: number;
}

@Injectable()
export class JobQueueService {
  constructor(private readonly db: PostgresService) {}

  async enqueue(
    queue: string,
    type: string,
    payload: unknown,
    maxAttempts = 5,
    availableAt = new Date(),
  ): Promise<string> {
    this.requireDatabase();

    const id = randomUUID();

    await this.db.query(
      `INSERT INTO ai_jobs
        (id, queue, type, payload, status, max_attempts, available_at)
       VALUES ($1, $2, $3, $4, 'QUEUED', $5, $6)`,
      [id, queue, type, JSON.stringify(payload), maxAttempts, availableAt],
    );

    return id;
  }

  async claim(queue: string, workerId: string): Promise<JobRecord | null> {
    this.requireDatabase();

    return this.db.transaction(async (client) => {
      const result = await client.query<JobRow>(
        `SELECT id, queue, type, payload, attempts, max_attempts
         FROM ai_jobs
         WHERE queue = $1
           AND status = 'QUEUED'
           AND available_at <= NOW()
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [queue],
      );

      const row = result.rows[0];

      if (!row) {
        return null;
      }

      await client.query(
        `UPDATE ai_jobs
         SET status = 'RUNNING',
             attempts = attempts + 1,
             locked_at = NOW(),
             locked_by = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [row.id, workerId],
      );

      return {
        id: row.id,
        queue: row.queue,
        type: row.type,
        payload: row.payload,
        attempts: row.attempts + 1,
        maxAttempts: row.max_attempts,
      };
    });
  }

  async complete(id: string): Promise<void> {
    this.requireDatabase();

    await this.db.query(
      `UPDATE ai_jobs
       SET status = 'COMPLETED', updated_at = NOW()
       WHERE id = $1 AND status = 'RUNNING'`,
      [id],
    );
  }

  async fail(id: string, error: unknown): Promise<void> {
    this.requireDatabase();

    await this.db.transaction(async (client) => {
      const result = await client.query<{
        attempts: number;
        max_attempts: number;
      }>(
        `SELECT attempts, max_attempts
         FROM ai_jobs
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      const row = result.rows[0];

      if (!row) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown job error';

      if (row.attempts >= row.max_attempts) {
        await client.query(
          `UPDATE ai_jobs
           SET status = 'DEAD', last_error = $2, updated_at = NOW()
           WHERE id = $1`,
          [id, message],
        );
        return;
      }

      const delaySeconds = Math.min(
        300,
        2 ** Math.max(row.attempts - 1, 0),
      );

      await client.query(
        `UPDATE ai_jobs
         SET status = 'QUEUED',
             available_at = NOW() + ($2 * INTERVAL '1 second'),
             last_error = $3,
             locked_at = NULL,
             locked_by = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [id, delaySeconds, message],
      );
    });
  }

  private requireDatabase(): void {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException(
        'Durable job queue requires DATABASE_URL',
      );
    }
  }
}
