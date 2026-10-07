import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { AiToolContext } from '../tools/tool.types';
import { ToolRegistryService } from '../tools/tool-registry.service';

export interface ToolApprovalRequest {
  readonly id: string;
  readonly space: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly toolName: string;
  readonly input: unknown;
  readonly status:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'EXECUTED'
    | 'FAILED';
  readonly expiresAt: string;
}

interface ApprovalRow {
  readonly id: string;
  readonly space: string;
  readonly tenant_id: string | null;
  readonly user_id: string | null;
  readonly tool_name: string;
  readonly input_json: unknown;
  readonly status: ToolApprovalRequest['status'];
  readonly expires_at: Date;
}

@Injectable()
export class ToolApprovalService {
  private readonly ttlMs = 10 * 60 * 1000;

  constructor(
    private readonly db: PostgresService,
    private readonly registry: ToolRegistryService,
  ) {}

  async request(
    toolName: string,
    input: unknown,
    context: AiToolContext,
  ): Promise<ToolApprovalRequest> {
    const tool = this.registry.get(toolName);

    if (tool.permission !== 'SENSITIVE_WRITE') {
      throw new BadRequestException(
        'Only SENSITIVE_WRITE tools require approval',
      );
    }

    if (!tool.spaces.includes(context.space)) {
      throw new ForbiddenException('Tool is not available in this AI space');
    }

    if (!context.userId) {
      throw new ForbiddenException('User context is required');
    }

    if (!context.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    if (tool.validateInput && !tool.validateInput(input)) {
      throw new BadRequestException('Invalid tool input');
    }

    if (!process.env.DATABASE_URL) {
      throw new BadRequestException(
        'Sensitive tool approvals require durable storage',
      );
    }

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.db.query(
      `INSERT INTO ai_approval_requests
        (id, space, tenant_id, user_id, tool_name, input_json, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)`,
      [
        id,
        context.space,
        context.tenantId,
        context.userId,
        tool.name,
        JSON.stringify(input),
        expiresAt,
      ],
    );

    return {
      id,
      space: context.space,
      tenantId: context.tenantId,
      userId: context.userId,
      toolName: tool.name,
      input,
      status: 'PENDING',
      expiresAt: expiresAt.toISOString(),
    };
  }

  async decide(
    id: string,
    approved: boolean,
    approverUserId: string,
    approverRoles: readonly string[],
  ): Promise<ToolApprovalRequest> {
    if (!approverUserId || !approverRoles.includes('ai:approver')) {
      throw new ForbiddenException('AI approver permission required');
    }

    const result = await this.db.query<ApprovalRow>(
      `SELECT id, space, tenant_id, user_id, tool_name, input_json, status, expires_at
       FROM ai_approval_requests
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('AI approval request not found');
    }

    if (row.status !== 'PENDING') {
      throw new BadRequestException('AI approval request is no longer pending');
    }

    if (row.expires_at <= new Date()) {
      await this.db.query(
        `UPDATE ai_approval_requests
         SET status = 'EXPIRED', decided_at = NOW()
         WHERE id = $1 AND status = 'PENDING'`,
        [id],
      );
      throw new BadRequestException('AI approval request has expired');
    }

    const nextStatus = approved ? 'APPROVED' : 'REJECTED';

    await this.db.query(
      `UPDATE ai_approval_requests
       SET status = $2, decided_at = NOW(), reason = $3
       WHERE id = $1 AND status = 'PENDING'`,
      [id, nextStatus, `decided_by:${approverUserId}`],
    );

    return {
      id: row.id,
      space: row.space,
      tenantId: row.tenant_id ?? undefined,
      userId: row.user_id ?? undefined,
      toolName: row.tool_name,
      input: row.input_json,
      status: nextStatus,
      expiresAt: row.expires_at.toISOString(),
    };
  }
}
