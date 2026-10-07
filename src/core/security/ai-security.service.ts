import { BadRequestException, Injectable } from '@nestjs/common';
import { AiRequest } from '../contracts/ai.types';
import { CoreConfigService } from '../config/core-config.service';
import { SpaceRegistryService } from '../spaces/space-registry.service';

@Injectable()
export class AiSecurityService {
  constructor(
    private readonly config: CoreConfigService,
    private readonly spaces: SpaceRegistryService,
  ) {}

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

    if (!request.space.trim()) {
      throw new BadRequestException('space is required');
    }

    const space = this.spaces.resolve(request.space);

    if (space.status !== 'ACTIVE') {
      throw new BadRequestException('AI product space is not active');
    }

    if (!['CHAT', 'TOOL_CALL', 'KNOWLEDGE_QUERY'].includes(request.operation)) {
      throw new BadRequestException('unsupported AI operation');
    }

    if (request.context.roles.some((role) => role.length > 100)) {
      throw new BadRequestException('invalid role');
    }
  }
}
