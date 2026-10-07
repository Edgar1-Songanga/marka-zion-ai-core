import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiRequest } from '../core/contracts/ai.types';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { CoreConfigService } from '../core/config/core-config.service';
import { QuotaService } from '../core/quotas/quota.service';
import { UsageService } from '../core/observability/usage.service';
import { ToolApprovalService } from '../approvals/tool-approval.service';
import { ModelProviderRegistry } from '../model-layer/model-provider.registry';
import { ModelMessage, ModelToolDefinition } from '../model-layer/model-provider.types';
import { ToolExecutionService } from '../tools/tool-execution.service';
import { ToolRegistryService } from '../tools/tool-registry.service';

export interface AgentResult {
  readonly requestId: string;
  readonly text: string;
  readonly steps: number;
  readonly pendingApprovals: readonly string[];
}

@Injectable()
export class AgentOrchestratorService {
  constructor(
    private readonly config: CoreConfigService,
    private readonly providers: ModelProviderRegistry,
    private readonly tools: ToolExecutionService,
    private readonly registry: ToolRegistryService,
    private readonly approvals: ToolApprovalService,
    private readonly audit: AiAuditService,
    private readonly quotas: QuotaService,
    private readonly usage: UsageService,
  ) {}

  async run(request: AiRequest): Promise<AgentResult> {
    const requestId = request.context.requestId ?? randomUUID();
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: request.input,
      },
    ];

    const tools: ModelToolDefinition[] = this.registry
      .listDefinitions(request.space)
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema!,
      }));

    const provider = this.providers.resolve();
    const pendingApprovals: string[] = [];

    for (let step = 1; step <= this.config.maxAgentSteps; step += 1) {
      const startedAt = Date.now();

      await this.quotas.reserveRequest(request.context.tenantId!);

      const result = await provider.generate({
        space: request.space,
        input: request.input,
        correlationId: request.context.correlationId,
        tenantId: request.context.tenantId!,
        userId: request.context.userId,
        conversationId: request.conversationId,
        messages,
        tools,
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
        status: result.toolCalls?.length ? 'TOOL_CALLS' : 'COMPLETED',
      });

      if (!result.toolCalls?.length) {
        return {
          requestId,
          text: result.text,
          steps: step,
          pendingApprovals,
        };
      }

      messages.push({
        role: 'assistant',
        content: result.text || null,
        toolCalls: result.toolCalls,
      });

      for (const toolCall of result.toolCalls.slice(0, 8)) {
        const tool = this.registry.get(toolCall.name);

        if (tool.permission === 'SENSITIVE_WRITE') {
          const approval = await this.approvals.request(
            tool.name,
            toolCall.arguments,
            {
              space: request.space,
              tenantId: request.context.tenantId,
              userId: request.context.userId,
              roles: request.context.roles,
              correlationId: request.context.correlationId,
            },
          );

          pendingApprovals.push(approval.id);

          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: JSON.stringify({
              status: 'PENDING_APPROVAL',
              approvalId: approval.id,
            }),
          });

          continue;
        }

        let output: unknown;

        try {
          const execution = await this.tools.execute({
            requestId,
            toolName: toolCall.name,
            input: toolCall.arguments,
            idempotencyKey: `agent:${requestId}:${toolCall.id}`,
            context: {
              space: request.space,
              tenantId: request.context.tenantId,
              userId: request.context.userId,
              roles: request.context.roles,
              correlationId: request.context.correlationId,
              idempotencyKey: `agent:${requestId}:${toolCall.id}`,
            },
          });

          output = execution.data;
        } catch (error) {
          output = {
            status: 'ERROR',
            message:
              error instanceof BadRequestException
                ? error.message
                : 'Tool execution failed',
          };
        }

        messages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: JSON.stringify(output),
        });
      }
    }

    await this.audit.recordToolInvocation({
      event: 'AI_AGENT_STEP_LIMIT_REACHED',
      requestId,
      correlationId: request.context.correlationId,
      space: request.space,
      operation: 'CHAT',
      userId: request.context.userId,
      tenantId: request.context.tenantId,
      status: 'STOPPED',
    });

    throw new InternalServerErrorException(
      'AI agent exceeded the configured step limit',
    );
  }
}
