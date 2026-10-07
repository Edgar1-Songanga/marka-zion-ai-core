import { Injectable, Logger } from '@nestjs/common';
import { AiRequest } from '../contracts/ai.types';

export interface AiAuditEvent {
  readonly event: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly space: string;
  readonly operation: string;
  readonly userId?: string;
  readonly timestamp: string;
}

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  recordAccepted(request: AiRequest, requestId: string): void {
    const event: AiAuditEvent = {
      event: 'AI_REQUEST_ACCEPTED',
      requestId,
      correlationId: request.context.correlationId,
      space: request.space,
      operation: request.operation,
      userId: request.context.userId,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(event));
  }
}
