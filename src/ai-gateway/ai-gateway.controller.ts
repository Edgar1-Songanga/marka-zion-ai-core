import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AiOperation,
  AiRequest,
  AiResponse,
  AiSpace,
} from '../core/contracts/ai.types';
import { AiAuthenticatedContext } from '../core/security/ai-authenticated-context';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { ToolExecutionResult } from '../tools/tool-execution.service';
import { ModelGenerationResponse } from '../model-layer/model-provider.types';
import { AiGatewayService } from './ai-gateway.service';

interface AiGatewayBody {
  readonly space: AiSpace;
  readonly operation: AiOperation;
  readonly input: string;
  readonly conversationId?: string;
}

interface AuthenticatedRequest {
  aiContext?: AiAuthenticatedContext;
}

@Controller('v1/ai')
@UseGuards(AiApiKeyGuard)
export class AiGatewayController {
  constructor(private readonly gateway: AiGatewayService) {}

  @Post('requests')
  accept(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<AiResponse> {
    return this.gateway.accept(this.toRequest(body, correlationId, request));
  }

  @Post('generate')
  async generate(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<ModelGenerationResponse & { requestId: string }> {
    return this.gateway.generate(this.toRequest(body, correlationId, request));
  }

  @Post('tools/execute')
  async executeTool(
    @Body() body: AiGatewayBody,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<ToolExecutionResult> {
    return this.gateway.executeTool(
      this.toRequest(body, correlationId, request),
      idempotencyKey,
    );
  }

  private toRequest(
    body: AiGatewayBody,
    correlationId: string | undefined,
    request: AuthenticatedRequest,
  ): AiRequest {
    const authenticated = request.aiContext;

    if (authenticated?.space && authenticated.space !== body.space) {
      throw new BadRequestException('AI context space does not match request');
    }

    const useSignedContext = Boolean(authenticated?.space);

    return {
      space: useSignedContext ? authenticated!.space : body.space,
      operation: body.operation,
      input: body.input,
      conversationId: body.conversationId,
      context: {
        correlationId: correlationId?.trim() || randomUUID(),
        userId: useSignedContext ? authenticated!.userId : undefined,
        tenantId: useSignedContext
          ? authenticated!.tenantId
          : undefined,
        roles: useSignedContext ? authenticated!.roles : [],
      },
    };
  }
}
