import { BadRequestException, Injectable } from '@nestjs/common';
import { AiRequest } from '../contracts/ai.types';
import { CoreConfigService } from '../config/core-config.service';

@Injectable()
export class AiSecurityService {
  constructor(private readonly config: CoreConfigService) {}

  validateRequest(request: AiRequest): void {
    if (!request.context.correlationId.trim()) {
      throw new BadRequestException('correlationId is required');
    }

    const input = request.input.trim();

    if (!input) {
      throw new BadRequestException('input is required');
    }

    if (input.length > this.config.maxInputCharacters) {
      throw new BadRequestException('input exceeds the configured limit');
    }

    if (!['zion', 'marka'].includes(request.space)) {
      throw new BadRequestException('unsupported AI space');
    }

    if (!['CHAT', 'TOOL_CALL', 'KNOWLEDGE_QUERY'].includes(request.operation)) {
      throw new BadRequestException('unsupported AI operation');
    }

    if (request.context.roles.some((role) => role.length > 100)) {
      throw new BadRequestException('invalid role');
    }
  }
}
