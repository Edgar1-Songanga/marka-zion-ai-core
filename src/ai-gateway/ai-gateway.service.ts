import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { AiRequest, AiResponse } from '../core/contracts/ai.types';
import { AiSecurityService } from '../core/security/ai-security.service';
import { QuotaService } from '../core/quotas/quota.service';
import { UsageService } from '../core/observability/usage.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AgentOrchestratorService } from '../agent/agent-orchestrator.service';
import {
  ToolExecutionResult,
  ToolExecutionService,
} from '../tools/tool-execution.service';
import { ModelProviderRegistry } from '../model-layer/model-provider.registry';
import { ModelGenerationResponse } from '../model-layer/model-provider.types';

export interface AiToolCallEnvelope {
  readonly toolName: string;
  readonly input: unknown;
}

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly security: AiSecurityService,
    private readonly audit: AiAuditService,
    private readonly providers: ModelProviderRegistry,
    private readonly tools: ToolExecutionService,
    private readonly quotas: QuotaService,
    private readonly usage: UsageService,
    private readonly knowledge: KnowledgeService,
    private readonly agent: AgentOrchestratorService,
  ) {}

  async accept(request: AiRequest): Promise<AiResponse> {
    this.security.validateRequest(request);
    this.requireTenant(request);

    const requestId = request.context.requestId ?? randomUUID();

    await this.audit.recordAccepted(request, requestId);

    return {
      requestId,
      correlationId: request.context.correlationId,
      space: request.space,
      status: 'accepted',
    };
  }

  async generate(
    request: AiRequest,
  ): Promise<ModelGenerationResponse & { requestId: string }> {
    this.security.validateRequest(request);
    this.requireTenant(request);

    if (request.operation !== 'CHAT') {
      throw new BadRequestException(
        'Only CHAT requests can use the model generation endpoint',
      );
    }

    const requestId = request.context.requestId ?? randomUUID();
    await this.audit.recordAccepted(request, requestId);

    const result = await this.agent.run({
      ...request,
      context: {
        ...request.context,
        requestId,
      },
    });

    return {
      requestId,
      provider: result.provider,
      model: result.model,
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    }
  }

  async executeTool(
    request: AiRequest,
    idempotencyKey?: string,
  ): Promise<ToolExecutionResult> {
    this.security.validateRequest(request);
    this.requireTenant(request);

    if (request.operation !== 'TOOL_CALL') {
      throw new BadRequestException(
        'Tool execution requires operation TOOL_CALL',
      );
    }

    const requestId = request.context.requestId ?? randomUUID();

    await this.quotas.reserveRequest(request.context.tenantId!);
    await this.audit.recordAccepted(request, requestId);

    let envelope: AiToolCallEnvelope;

    try {
      envelope = JSON.parse(request.input) as AiToolCallEnvelope;
    } catch {
      throw new BadRequestException('TOOL_CALL input must be valid JSON');
    }

    if (
      !envelope ||
      typeof envelope !== 'object' ||
      Array.isArray(envelope) ||
      typeof envelope.toolName !== 'string' ||
      !envelope.toolName.trim() ||
      !Object.prototype.hasOwnProperty.call(envelope, 'input')
    ) {
      throw new BadRequestException(
        'TOOL_CALL input must contain toolName and input',
      );
    }

    return this.tools.execute({
      requestId,
      toolName: envelope.toolName,
      input: envelope.input,
      idempotencyKey,
      context: {
        space: request.space,
        userId: request.context.userId,
        tenantId: request.context.tenantId,
        roles: request.context.roles,
        accessLevel: request.context.accessLevel ?? 'STANDARD',
        correlationId: request.context.correlationId,
        idempotencyKey,
      },
    });
  }

  private requireTenant(request: AiRequest): void {
    if (process.env.NODE_ENV === 'production' && !request.context.tenantId) {
      throw new BadRequestException('Authenticated tenant context is required');
    }
  }

  async queryKnowledge(request: AiRequest) {
    this.security.validateRequest(request);
    this.requireTenant(request);

    if (request.operation !== 'KNOWLEDGE_QUERY') {
      throw new BadRequestException(
        'Knowledge query requires operation KNOWLEDGE_QUERY',
      );
    }

    const requestId = request.context.requestId ?? randomUUID();

    await this.quotas.reserveRequest(request.context.tenantId!);
    await this.audit.recordAccepted(request, requestId);

    const documents = await this.knowledge.search({
      tenantId: request.context.tenantId!,
      space: request.space,
      query: request.input,
      limit: 10,
    });

    return {
      requestId,
      space: request.space,
      documents,
    };
  }
}
