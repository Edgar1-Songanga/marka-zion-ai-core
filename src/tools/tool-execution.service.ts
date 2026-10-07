import {
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CoreConfigService } from '../core/config/core-config.service';
import { AiAuditService } from '../core/audit/ai-audit.service';
import { AiToolContext } from './tool.types';
import { ToolRegistryService } from './tool-registry.service';

export interface ToolExecutionRequest {
  readonly requestId: string;
  readonly toolName: string;
  readonly input: unknown;
  readonly context: AiToolContext;
}

export interface ToolExecutionResult {
  readonly requestId: string;
  readonly toolName: string;
  readonly status: 'COMPLETED';
  readonly data: unknown;
}

@Injectable()
export class ToolExecutionService {
  constructor(
    private readonly registry: ToolRegistryService,
    private readonly audit: AiAuditService,
    private readonly config: CoreConfigService,
  ) {}

  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const name = request.toolName.trim();

    if (!name || name.length > 128) {
      throw new BadRequestException('Invalid AI tool name');
    }

    const tool = this.registry.authorize(name, request.context);

    if (tool.validateInput && !tool.validateInput(request.input)) {
      throw new BadRequestException('Invalid tool input');
    }

    this.audit.recordToolInvocation({
      event: 'AI_TOOL_STARTED',
      requestId: request.requestId,
      correlationId: request.context.correlationId,
      space: request.context.space,
      operation: 'TOOL_CALL',
      userId: request.context.userId,
      tenantId: request.context.tenantId,
      toolName: name,
      permission: tool.permission,
      status: 'STARTED',
    });

    try {
      const data = await this.withTimeout(
        tool.execute(request.input, request.context),
        this.config.requestTimeoutMs,
      );

      let serialized: string;
      try {
        serialized = JSON.stringify(data);
      } catch {
        throw new BadRequestException('Tool output is not serializable');
      }

      if (serialized.length > this.config.maxToolOutputCharacters) {
        throw new BadRequestException('Tool output exceeds configured limit');
      }

      this.audit.recordToolInvocation({
        event: 'AI_TOOL_COMPLETED',
        requestId: request.requestId,
        correlationId: request.context.correlationId,
        space: request.context.space,
        operation: 'TOOL_CALL',
        userId: request.context.userId,
        tenantId: request.context.tenantId,
        toolName: name,
        permission: tool.permission,
        status: 'COMPLETED',
      });

      return {
        requestId: request.requestId,
        toolName: name,
        status: 'COMPLETED',
        data,
      };
    } catch (error) {
      this.audit.recordToolInvocation({
        event: 'AI_TOOL_FAILED',
        requestId: request.requestId,
        correlationId: request.context.correlationId,
        space: request.context.space,
        operation: 'TOOL_CALL',
        userId: request.context.userId,
        tenantId: request.context.tenantId,
        toolName: name,
        permission: tool.permission,
        status: 'FAILED',
      });

      if (
        error instanceof BadRequestException ||
        error instanceof GatewayTimeoutException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('AI tool execution failed');
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new GatewayTimeoutException('AI tool execution timed out')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
