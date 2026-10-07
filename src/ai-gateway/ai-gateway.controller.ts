import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiSpace, AiOperation, AiRequest, AiResponse } from '../core/contracts/ai.types';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
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
    const request: AiRequest = {
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

    return this.gateway.accept(request);
  }
}
