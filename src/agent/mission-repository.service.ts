import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { MissionState } from './mission.types';

interface MissionRow {
  mission_id: string;
  status: MissionState['status'];
  plan_json: MissionState['plan'];
}

export interface MissionCheckpoint {
  readonly phase: string;
  readonly taskId?: string;
  readonly data?: Record<string, unknown>;
  readonly updatedAt: string;
}

@Injectable()
export class MissionRepositoryService {
  constructor(private readonly db: PostgresService) {}

  async create(state: MissionState, input: { tenantId: string; userId: string; accessLevel: 'STANDARD' | 'OWNER'; executionMode: 'ADVISORY' | 'EXECUTION' | 'AUTONOMOUS'; budgetTokens?: number }): Promise<MissionState> {
    await this.db.query(
      `INSERT INTO ai_missions
        (mission_id, tenant_id, user_id, access_level, execution_mode, status, objective, plan_json, checkpoint_json, budget_tokens)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'{}'::jsonb,$9)
       ON CONFLICT (mission_id) DO NOTHING`,
      [state.missionId, input.tenantId, input.userId, input.accessLevel, input.executionMode, state.status, state.plan.objective, JSON.stringify(state.plan), input.budgetTokens ?? null],
    );
    return this.get(state.missionId, input.tenantId);
  }

  async get(missionId: string, tenantId: string): Promise<MissionState> {
    const result = await this.db.query<MissionRow>(
      'SELECT mission_id, status, plan_json FROM ai_missions WHERE mission_id = $1 AND tenant_id = $2',
      [missionId, tenantId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Mission not found');
    return { missionId: row.mission_id, status: row.status, plan: row.plan_json };
  }

  async transition(missionId: string, tenantId: string, fromStatus: MissionState['status'], toStatus: MissionState['status'], eventType: string, actorUserId: string): Promise<MissionState> {
    return this.db.transaction(async (client) => {
      const current = await client.query<MissionRow>(
        'SELECT mission_id, status, plan_json FROM ai_missions WHERE mission_id = $1 AND tenant_id = $2 FOR UPDATE',
        [missionId, tenantId],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('Mission not found');
      if (row.status !== fromStatus) throw new Error(`Mission state conflict: expected ${fromStatus}, got ${row.status}`);

      await client.query(
        'UPDATE ai_missions SET status = $3, version = version + 1, updated_at = NOW() WHERE mission_id = $1 AND tenant_id = $2',
        [missionId, tenantId, toStatus],
      );
      await client.query(
        'INSERT INTO ai_mission_events (mission_id, from_status, to_status, event_type, actor_user_id) VALUES ($1,$2,$3,$4,$5)',
        [missionId, fromStatus, toStatus, eventType, actorUserId],
      );
      return { missionId: row.mission_id, status: toStatus, plan: row.plan_json };
    });
  }

  async checkpoint(missionId: string, tenantId: string, checkpoint: MissionCheckpoint): Promise<void> {
    const result = await this.db.query(
      'UPDATE ai_missions SET checkpoint_json = $3::jsonb, version = version + 1, updated_at = NOW() WHERE mission_id = $1 AND tenant_id = $2',
      [missionId, tenantId, JSON.stringify(checkpoint)],
    );
    if (result.rowCount !== 1) throw new NotFoundException('Mission not found');
  }

  async consumeTokens(missionId: string, tenantId: string, tokens: number): Promise<void> {
    if (!Number.isSafeInteger(tokens) || tokens < 0) throw new Error('Token usage must be a non-negative safe integer');
    const result = await this.db.query(
      'UPDATE ai_missions SET consumed_tokens = consumed_tokens + $3, version = version + 1, updated_at = NOW() WHERE mission_id = $1 AND tenant_id = $2 AND (budget_tokens IS NULL OR consumed_tokens + $3 <= budget_tokens)',
      [missionId, tenantId, tokens],
    );
    if (result.rowCount !== 1) throw new Error('Mission token budget exceeded or mission not found');
  }
}
