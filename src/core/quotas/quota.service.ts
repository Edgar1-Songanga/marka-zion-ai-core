import {
  Injectable,
  ServiceUnavailableException,
  HttpException,
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
    this.requireTenant(tenantId);

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

    await this.db.query(
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
    ).then((result) => {
      if (result.rowCount !== 1) {
        throw new HttpException(
          'Tenant request rate limit exceeded', 429,
        );
      }
    });
  }

  async recordTokens(
    tenantId: string,
    inputTokens = 0,
    outputTokens = 0,
  ): Promise<void> {
    this.requireTenant(tenantId);

    const input = this.sanitizeTokens(inputTokens);
    const output = this.sanitizeTokens(outputTokens);
    const tokens = input + output;

    if (!process.env.DATABASE_URL || tokens === 0) {
      return;
    }

    const now = new Date();
    const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const usageDay = now.toISOString().slice(0, 10);

    await this.db.transaction(async (client) => {
      const daily = await client.query(
        `INSERT INTO ai_tenant_daily_usage
          (tenant_id, usage_day, token_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, usage_day)
         DO UPDATE SET
           token_count = ai_tenant_daily_usage.token_count + EXCLUDED.token_count,
           updated_at = NOW()
         WHERE ai_tenant_daily_usage.token_count + EXCLUDED.token_count <= $4
         RETURNING token_count`,
        [tenantId, usageDay, tokens, this.tokensPerDay],
      );

      if (daily.rowCount !== 1) {
        throw new HttpException(
          'Tenant daily token quota exceeded', 429,
        );
      }

      await client.query(
        `INSERT INTO ai_rate_limit_buckets
          (tenant_id, bucket_start, request_count, token_count)
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (tenant_id, bucket_start)
         DO UPDATE SET
           token_count = ai_rate_limit_buckets.token_count + EXCLUDED.token_count,
           updated_at = NOW()`,
        [tenantId, minute, tokens],
      );
    });
  }

  private sanitizeTokens(value: number): number {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return 0;
    }
    return Math.min(value, 10_000_000);
  }

  private requireTenant(tenantId: string): void {
    if (!tenantId?.trim() || tenantId.length > 128) {
      throw new ServiceUnavailableException('Valid tenant context is required');
    }
  }

  private parsePositive(value: string | undefined, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
