import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiRequest } from '../contracts/ai.types';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

export interface AiAuditEvent {
  readonly event: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly space: string;
  readonly operation: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly toolName?: string;
  readonly permission?: string;
  readonly status?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(private readonly db: PostgresService) {}

  async recordAccepted(request: AiRequest, requestId: string): Promise<void> {
    await this.write({
      event: 'AI_REQUEST_ACCEPTED',
      requestId,
      correlationId: request.context.correlationId,
      space: request.space,
      operation: request.operation,
      userId: request.context.userId,
      tenantId: request.context.tenantId,
    });
  }

  async recordToolInvocation(
    event: Omit<AiAuditEvent, 'timestamp'>,
  ): Promise<void> {
    await this.write(event);
  }

  private async write(event: Omit<AiAuditEvent, 'timestamp'>): Promise<void> {
    const timestamp = new Date().toISOString();

    this.logger.log(JSON.stringify({ ...event, timestamp }));

    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Durable AI audit storage is not configured',
        );
      }

      return;
    }

    await this.db.query(
      `INSERT INTO ai_audit_events
        (event, request_id, correlation_id, space, operation, user_id, tenant_id,
         tool_name, permission, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        event.event,
        event.requestId,
        event.correlationId,
        event.space,
        event.operation,
        event.userId ?? null,
        event.tenantId ?? null,
        event.toolName ?? null,
        event.permission ?? null,
        event.status ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        timestamp,
      ],
    );
  }
}
