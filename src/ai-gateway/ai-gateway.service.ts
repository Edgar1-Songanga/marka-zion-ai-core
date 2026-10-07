import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { AiRequest, AiResponse } from '../core/contracts/ai.types';
import { AiSecurityService } from '../core/security/ai-security.service';
import { QuotaService } from '../core/quotas/quota.service';
import { UsageService } from '../core/observability/usage.service';
import { ToolExecutionResult, ToolExecutionService } from '../tools/tool-execution.service';
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
  ) {}

  async accept(request: AiRequest): Promise<AiResponse> {
    this.security.validateRequest(request);

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

    if (request.operation === 'TOOL_CALL') {
      throw new BadRequestException(
        'TOOL_CALL must use the governed tool execution endpoint',
      );
    }

    const requestId = request.context.requestId ?? randomUUID();
    const startedAt = Date.now();

    await this.quotas.reserveRequest(request.context.tenantId!);
    await this.audit.recordAccepted(request, requestId);

    try {
      const provider = this.providers.resolve();

      const result = await provider.generate({
        space: request.space,
        input: request.input,
        correlationId: request.context.correlationId,
      });

      await this.quotas.recordTokens(
        request.context.tenantId!,
        result.inputTokens,
        result.outputTokens,
      );

      await this.usage.record({
        tenantId: request.context.tenantId!,
        space: request.space,
        userId: request.context.userId,
        requestId,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startedAt,
        status: 'COMPLETED',
      });

      return {
        requestId,
        ...result,
      };
    } catch (error) {
      await this.usage.record({
        tenantId: request.context.tenantId!,
        space: request.space,
        userId: request.context.userId,
        requestId,
        durationMs: Date.now() - startedAt,
        status: 'FAILED',
      }).catch(() => undefined);

      throw error;
    }
  }

  async executeTool(
    request: AiRequest,
    idempotencyKey?: string,
  ): Promise<ToolExecutionResult> {
    this.security.validateRequest(request);

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
        correlationId: request.context.correlationId,
      },
    });
  }
}
