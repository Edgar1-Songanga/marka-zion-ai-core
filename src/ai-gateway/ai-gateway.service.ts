import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { AiRequest, AiResponse } from '../core/contracts/ai.types';
import { AiSecurityService } from '../core/security/ai-security.service';

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly security: AiSecurityService,
    private readonly audit: AiAuditService,
  ) {}

  accept(request: AiRequest): AiResponse {
    this.security.validateRequest(request);

    const requestId = request.context.requestId ?? randomUUID();

    this.audit.recordAccepted(request, requestId);

    return {
      requestId,
      correlationId: request.context.correlationId,
      space: request.space,
      status: 'accepted',
    };
  }
}
