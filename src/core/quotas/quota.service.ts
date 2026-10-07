import {
  Injectable,
  ServiceUnavailableException,
  TooManyRequestsException,
} from '@nestjs/common';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

@Injectable()
export class QuotaService {
  private readonly requestsPerMinute = this.parsePositive(
    process.env.AI_REQUESTS_PER_MINUTE,
    60,
  );
  private readonly tokensPerDay = this.parsePositive(
    process.env.AI_TOKENS_PER_DAY,
    2_000_000,
  );

  constructor(private readonly db: PostgresService) {}

  async reserveRequest(tenantId: string): Promise<void> {
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Quota storage is not configured',
        );
      }

      return;
    }

    const now = new Date();
    const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    await this.db.transaction(async (client) => {
      const minuteResult = await client.query(
        `INSERT INTO ai_rate_limit_buckets
          (tenant_id, bucket_start, request_count, token_count)
         VALUES ($1, $2, 1, 0)
         ON CONFLICT (tenant_id, bucket_start)
         DO UPDATE SET
           request_count = ai_rate_limit_buckets.request_count + 1,
           updated_at = NOW()
         WHERE ai_rate_limit_buckets.request_count < $3
         RETURNING request_count`,
        [tenantId, minute, this.requestsPerMinute],
      );

      if (minuteResult.rowCount !== 1) {
        throw new TooManyRequestsException(
          'Tenant request rate limit exceeded',
        );
      }

      const daily = await client.query<{ token_count: string }>(
        `SELECT COALESCE(SUM(token_count), 0)::text AS token_count
         FROM ai_rate_limit_buckets
         WHERE tenant_id = $1 AND bucket_start >= $2`,
        [tenantId, day],
      );

      if (Number(daily.rows[0]?.token_count ?? 0) >= this.tokensPerDay) {
        throw new TooManyRequestsException('Tenant daily token quota exceeded');
      }
    });
  }

  async recordTokens(
    tenantId: string,
    inputTokens = 0,
    outputTokens = 0,
  ): Promise<void> {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const now = new Date();
    const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const tokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);

    await this.db.query(
      `INSERT INTO ai_rate_limit_buckets
        (tenant_id, bucket_start, request_count, token_count)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (tenant_id, bucket_start)
       DO UPDATE SET
         token_count = ai_rate_limit_buckets.token_count + EXCLUDED.token_count,
         updated_at = NOW()`,
      [tenantId, minute, tokens],
    );
  }

  private parsePositive(value: string | undefined, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
