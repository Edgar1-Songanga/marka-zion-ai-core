import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AiAuthenticatedContext } from '../core/security/ai-authenticated-context';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { ToolApprovalService } from './tool-approval.service';

interface ApprovalBody {
  readonly toolName: string;
  readonly input: unknown;
  readonly space: string;
}

interface DecisionBody {
  readonly approved: boolean;
}

interface AuthenticatedRequest {
  aiContext?: AiAuthenticatedContext;
}

@Controller('v1/ai/approvals')
@UseGuards(AiApiKeyGuard)
export class ToolApprovalController {
  constructor(private readonly approvals: ToolApprovalService) {}

  @Post()
  request(
    @Body() body: ApprovalBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = this.requireContext(request);

    if (context.space !== body.space) {
      throw new BadRequestException('AI context space does not match request');
    }

    return this.approvals.request(body.toolName, body.input, {
      space: context.space,
      userId: context.userId,
      tenantId: context.tenantId,
      roles: context.roles,
      correlationId: 'approval-request',
    });
  }

  @Post(':id/decision')
  decide(
    @Param('id') id: string,
    @Body() body: DecisionBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = this.requireContext(request);

    return this.approvals.decide(
      id,
      body.approved,
      context.userId ?? '',
      context.tenantId,
      context.roles,
    );
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = this.requireContext(request);

    return this.approvals.executeApproved(
      id,
      context.userId ?? '',
      context.tenantId,
    );
  }

  private requireContext(
    request: AuthenticatedRequest,
  ): AiAuthenticatedContext {
    if (!request.aiContext?.space) {
      throw new BadRequestException(
        'Signed AI product context is required for approvals',
      );
    }

    return request.aiContext;
  }
}
