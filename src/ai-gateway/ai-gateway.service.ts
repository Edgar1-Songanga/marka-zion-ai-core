import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AiRequest, AiResponse } from './ai-gateway.types';

@Injectable()
export class AiGatewayService {
  accept(request: AiRequest): AiResponse {
    return {
      requestId: randomUUID(),
      space: request.space,
      status: 'accepted',
    };
  }
}
