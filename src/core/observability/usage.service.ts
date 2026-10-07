import { Injectable } from '@nestjs/common';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

export interface AiUsageEvent {
  readonly tenantId: string;
  readonly space: string;
  readonly userId?: string;
  readonly requestId: string;
  readonly provider?: string;
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly estimatedCostMicrounits?: bigint;
  readonly durationMs: number;
  readonly status: string;
}

@Injectable()
export class UsageService {
  constructor(private readonly db: PostgresService) {}

  async record(event: AiUsageEvent): Promise<void> {
    if (!process.env.DATABASE_URL) {
      return;
    }

    await this.db.query(
      `INSERT INTO ai_usage_events
        (tenant_id, space, user_id, request_id, provider, model,
         input_tokens, output_tokens, estimated_cost_microunits, duration_ms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.tenantId,
        event.space,
        event.userId ?? null,
        event.requestId,
        event.provider ?? null,
        event.model ?? null,
        event.inputTokens ?? null,
        event.outputTokens ?? null,
        event.estimatedCostMicrounits?.toString() ?? null,
        event.durationMs,
        event.status,
      ],
    );
  }
}
