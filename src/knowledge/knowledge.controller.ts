import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AiAuthenticatedContext } from '../core/security/ai-authenticated-context';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { KnowledgeAdminService } from './knowledge-admin.service';

interface KnowledgeBody {
  readonly space: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

interface AuthenticatedRequest {
  aiContext?: AiAuthenticatedContext;
}

@Controller('v1/ai/knowledge')
@UseGuards(AiApiKeyGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeAdminService) {}

  @Post()
  upsert(
    @Body() body: KnowledgeBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.aiContext;

    if (!context?.space) {
      throw new BadRequestException(
        'Signed AI product context is required for knowledge ingestion',
      );
    }

    if (context.space !== body.space) {
      throw new BadRequestException('AI context space does not match request');
    }

    if (!context.roles.includes('ai:knowledge-admin')) {
      throw new BadRequestException('AI knowledge admin permission required');
    }

    return this.knowledge.upsert({
      tenantId: context.tenantId,
      space: context.space,
      title: body.title,
      content: body.content,
      source: body.source,
      metadata: body.metadata,
    });
  }
}
