import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { AiToolContext } from '../tools/tool.types';
import { ToolExecutionService } from '../tools/tool-execution.service';
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
    private readonly execution: ToolExecutionService,
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

    if (!context.userId || !context.tenantId) {
      throw new ForbiddenException(
        'User and tenant context are required for sensitive actions',
      );
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

  async executeApproved(
    id: string,
    actorUserId: string,
    actorTenantId: string,
  ) {
    if (!actorUserId || !actorTenantId) {
      throw new ForbiddenException('Authenticated actor context is required');
    }

    const result = await this.db.transaction(async (client) => {
      const locked = await client.query<ApprovalRow>(
        `SELECT id, space, tenant_id, user_id, tool_name, input_json, status, expires_at
         FROM ai_approval_requests
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      const row = locked.rows[0];

      if (!row) {
        throw new NotFoundException('AI approval request not found');
      }

      if (row.tenant_id !== actorTenantId) {
        throw new ForbiddenException('Approval request tenant mismatch');
      }

      if (row.status !== 'APPROVED') {
        throw new BadRequestException('AI approval request is not approved');
      }

      if (row.expires_at <= new Date()) {
        await client.query(
          `UPDATE ai_approval_requests SET status = 'EXPIRED' WHERE id = $1`,
          [id],
        );
        throw new BadRequestException('AI approval request has expired');
      }

      return row;
    });

    try {
      const execution = await this.execution.executeApproved({
        requestId: id,
        toolName: result.tool_name,
        input: result.input_json,
        idempotencyKey: `approval:${id}`,
        context: {
          space: result.space,
          tenantId: result.tenant_id ?? undefined,
          userId: result.user_id ?? actorUserId,
          roles: ['ai:write'],
          correlationId: `approval:${id}`,
          idempotencyKey: `approval:${id}`,
        },
      });

      await this.db.query(
        `UPDATE ai_approval_requests
         SET status = 'EXECUTED', executed_at = NOW()
         WHERE id = $1 AND status = 'APPROVED'`,
        [id],
      );

      return execution;
    } catch (error) {
      await this.db.query(
        `UPDATE ai_approval_requests
         SET status = 'FAILED', executed_at = NOW()
         WHERE id = $1 AND status = 'APPROVED'`,
        [id],
      );

      throw error;
    }
  }
}
