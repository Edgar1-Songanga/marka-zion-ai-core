import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AiApiKeyGuard } from '../core/security/ai-api-key.guard';
import { ToolApprovalService } from './tool-approval.service';

interface ApprovalBody {
  readonly toolName: string;
  readonly input: unknown;
  readonly space: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles?: readonly string[];
}

interface DecisionBody {
  readonly approved: boolean;
  readonly approverUserId: string;
  readonly approverRoles?: readonly string[];
}

interface ExecuteBody {
  readonly actorUserId: string;
  readonly actorTenantId: string;
}

@Controller('v1/ai/approvals')
@UseGuards(AiApiKeyGuard)
export class ToolApprovalController {
  constructor(private readonly approvals: ToolApprovalService) {}

  @Post()
  request(@Body() body: ApprovalBody) {
    return this.approvals.request(body.toolName, body.input, {
      space: body.space,
      userId: body.userId,
      tenantId: body.tenantId,
      roles: body.roles ?? [],
      correlationId: 'approval-request',
    });
  }

  @Post(':id/decision')
  decide(@Param('id') id: string, @Body() body: DecisionBody) {
    return this.approvals.decide(
      id,
      body.approved,
      body.approverUserId,
      body.approverRoles ?? [],
    );
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Body() body: ExecuteBody) {
    return this.approvals.executeApproved(
      id,
      body.actorUserId,
      body.actorTenantId,
    );
  }
}
