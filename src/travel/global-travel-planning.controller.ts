import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { AiAuthenticatedContext } from '../core/security/ai-authenticated-context';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { GlobalTravelPlanningService } from './global-travel-planning.service';
import { AgentRegistryService } from '../agent/agent-registry.service';

interface AuthenticatedRequest {
  aiContext?: AiAuthenticatedContext;
}

@Controller('v1/travel')
@UseGuards(AiApiKeyGuard)
export class GlobalTravelPlanningController {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly planning: GlobalTravelPlanningService,
    private readonly agents: AgentRegistryService,
  ) {}

  @Post('plan')
  async plan(
    @Body() body: unknown,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.aiContext;
    if (!context?.space || context.space !== 'global-travel') {
      throw new UnauthorizedException('Signed Global Travel product context is required');
    }
    if (!context.tenantId || !context.userId) {
      throw new BadRequestException('Signed traveller and tenant identity are required');
    }

    const intake = this.planning.normalize(body);
    const specialists = this.agents.select({
      requiredSkills: [
        'travel-planning',
        'visa-research',
        'flight-search',
        'hotel-search',
        'travel-risk',
      ],
      accessLevel: 'STANDARD',
      executionMode: 'ADVISORY',
      limit: 5,
    });
    const result = await this.gateway.generate({
      space: 'global-travel',
      operation: 'CHAT',
      input: this.planning.toPrompt(intake, specialists),
      context: {
        correlationId: correlationId?.trim() || randomUUID(),
        userId: context.userId,
        tenantId: context.tenantId,
        roles: context.roles,
        accessLevel: context.accessLevel,
      },
    });

    return {
      ...result,
      specialistLenses: specialists.map((agent) => ({
        id: agent.id,
        name: agent.name,
        responsibility: agent.description,
      })),
    };
  }
}
