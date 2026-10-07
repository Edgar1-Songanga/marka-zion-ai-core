import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { AiRequest, AiResponse } from '../core/contracts/ai.types';
import { AiSecurityService } from '../core/security/ai-security.service';
import { ModelProviderRegistry } from '../model-layer/model-provider.registry';
import { ModelGenerationResponse } from '../model-layer/model-provider.types';

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly security: AiSecurityService,
    private readonly audit: AiAuditService,
    private readonly providers: ModelProviderRegistry,
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

  async generate(request: AiRequest): Promise<ModelGenerationResponse & { requestId: string }> {
    this.security.validateRequest(request);

    const requestId = request.context.requestId ?? randomUUID();
    this.audit.recordAccepted(request, requestId);

    const provider = this.providers.resolve();

    const result = await provider.generate({
      space: request.space,
      input: request.input,
      correlationId: request.context.correlationId,
    });

    return {
      requestId,
      ...result,
    };
  }
}
