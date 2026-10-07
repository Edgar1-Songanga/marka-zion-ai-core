import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

interface IdempotencyRow {
  readonly status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  readonly request_hash: string;
  readonly response_json: unknown;
  readonly error_code: string | null;
  readonly expires_at: Date;
}

@Injectable()
export class IdempotencyService {
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  constructor(private readonly db: PostgresService) {}

  async run<T>(
    scope: string,
    key: string,
    payload: unknown,
    handler: () => Promise<T>,
  ): Promise<T> {
    const normalizedScope = this.normalize(scope, 128);
    const normalizedKey = this.normalize(key, 256);

    if (!normalizedScope || !normalizedKey) {
      throw new ConflictException('Valid idempotency scope and key are required');
    }

    const requestHash = this.hash(payload);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException(
        'Durable idempotency storage is not configured',
      );
    }

    const acquired = await this.db.transaction(async (client) => {
      const existing = await client.query<IdempotencyRow>(
        `SELECT status, request_hash, response_json, error_code, expires_at
         FROM ai_idempotency_records
         WHERE scope = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [normalizedScope, normalizedKey],
      );

      if (existing.rowCount && existing.rows[0]) {
        const row = existing.rows[0];

        if (row.expires_at <= new Date()) {
          await client.query(
            `DELETE FROM ai_idempotency_records
             WHERE scope = $1 AND idempotency_key = $2`,
            [normalizedScope, normalizedKey],
          );
        } else {
          if (row.request_hash !== requestHash) {
            throw new ConflictException(
              'Idempotency key was already used with a different request',
            );
          }

          return { acquired: false, row };
        }
      }

      await client.query(
        `INSERT INTO ai_idempotency_records
          (scope, idempotency_key, request_hash, status, expires_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', $4)
         ON CONFLICT (scope, idempotency_key) DO NOTHING`,
        [normalizedScope, normalizedKey, requestHash, expiresAt],
      );

      return { acquired: true };
    });

    if (!acquired.acquired) {
      const row = acquired.row;

      if (row.status === 'COMPLETED') {
        return row.response_json as T;
      }

      if (row.status === 'IN_PROGRESS') {
        throw new ConflictException('Request with this idempotency key is in progress');
      }

      throw new ConflictException(
        'Request with this idempotency key previously failed; use a new key',
      );
    }

    try {
      const result = await handler();

      await this.db.query(
        `UPDATE ai_idempotency_records
         SET status = 'COMPLETED', response_json = $3, updated_at = NOW()
         WHERE scope = $1 AND idempotency_key = $2`,
        [normalizedScope, normalizedKey, JSON.stringify(result)],
      );

      return result;
    } catch (error) {
      await this.db.query(
        `UPDATE ai_idempotency_records
         SET status = 'FAILED', error_code = $3, updated_at = NOW()
         WHERE scope = $1 AND idempotency_key = $2`,
        [
          normalizedScope,
          normalizedKey,
          error instanceof Error ? error.name.slice(0, 128) : 'UNKNOWN_ERROR',
        ],
      );

      throw error;
    }
  }

  private normalize(value: string, max: number): string {
    const normalized = value.trim();
    return normalized.length <= max ? normalized : '';
  }

  private hash(payload: unknown): string {
    return createHash('sha256')
      .update(this.canonicalize(payload))
      .digest('hex');
  }

  private canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();

    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${this.canonicalize(record[key])}`)
      .join(',')}}`;
  }
}
