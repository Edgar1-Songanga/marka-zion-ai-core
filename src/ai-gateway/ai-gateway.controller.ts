import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AiOperation,
  AiRequest,
  AiResponse,
  AiSpace,
} from '../core/contracts/ai.types';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { ToolExecutionResult } from '../tools/tool-execution.service';
import { ModelGenerationResponse } from '../model-layer/model-provider.types';
import { AiGatewayService } from './ai-gateway.service';

interface AiGatewayBody {
  readonly space: AiSpace;
  readonly operation: AiOperation;
  readonly input: string;
  readonly conversationId?: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles?: readonly string[];
}

@Controller('v1/ai')
@UseGuards(AiApiKeyGuard)
export class AiGatewayController {
  constructor(private readonly gateway: AiGatewayService) {}

  @Post('requests')
  accept(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId?: string,
  ): AiResponse {
    return this.gateway.accept(this.toRequest(body, correlationId));
  }

  @Post('generate')
  async generate(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<ModelGenerationResponse & { requestId: string }> {
    return this.gateway.generate(this.toRequest(body, correlationId));
  }

  @Post('tools/execute')
  async executeTool(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<ToolExecutionResult> {
    return this.gateway.executeTool(
      this.toRequest(body, correlationId),
      idempotencyKey,
    );
  }

  private toRequest(body: AiGatewayBody, correlationId?: string): AiRequest {
    return {
      space: body.space,
      operation: body.operation,
      input: body.input,
      conversationId: body.conversationId,
      context: {
        correlationId: correlationId?.trim() || randomUUID(),
        userId: body.userId,
        tenantId: body.tenantId,
        roles: body.roles ?? [],
      },
    };
  }
}
