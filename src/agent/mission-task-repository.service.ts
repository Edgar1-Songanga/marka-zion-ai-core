import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { MissionStatus } from './mission.types';

export type MissionTaskStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface MissionTask {
  readonly taskId: string;
  readonly missionId: string;
  readonly parentTaskId?: string;
  readonly agentId: string;
  readonly title: string;
  readonly status: MissionTaskStatus;
  readonly dependsOn: readonly string[];
  readonly input: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
  readonly attemptCount: number;
  readonly maxAttempts: number;
}

interface TaskRow {
  task_id: string;
  mission_id: string;
  parent_task_id: string | null;
  agent_id: string;
  title: string;
  status: MissionTaskStatus;
  depends_on: unknown;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
}

@Injectable()
export class MissionTaskRepositoryService {
  constructor(private readonly db: PostgresService) {}

  async createMany(
    missionId: string,
    tasks: readonly Omit<MissionTask, 'status' | 'attemptCount' | 'output'>[],
  ): Promise<readonly MissionTask[]> {
    if (tasks.length === 0) return [];

    return this.db.transaction(async (client) => {
      const ids = new Set<string>();
      for (const task of tasks) {
        if (ids.has(task.taskId)) throw new Error(`Duplicate task ID: ${task.taskId}`);
        ids.add(task.taskId);
        if (task.missionId !== missionId) throw new Error('All tasks must belong to the requested mission');
        if (task.dependsOn.includes(task.taskId)) throw new Error(`Task ${task.taskId} cannot depend on itself`);
        if (!Number.isSafeInteger(task.maxAttempts) || task.maxAttempts < 1 || task.maxAttempts > 10) {
          throw new Error(`Invalid maxAttempts for task ${task.taskId}`);
        }
      }

      const taskIds = new Set(tasks.map((task) => task.taskId));
      for (const task of tasks) {
        for (const dependency of task.dependsOn) {
          if (!taskIds.has(dependency)) {
            const existing = await client.query(
              'SELECT 1 FROM ai_mission_tasks WHERE mission_id = $1 AND task_id = $2',
              [missionId, dependency],
            );
            if (existing.rowCount !== 1) throw new Error(`Unknown dependency ${dependency} for task ${task.taskId}`);
          }
        }
      }

      for (const task of tasks) {
        await client.query(
          `INSERT INTO ai_mission_tasks
            (task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, max_attempts)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)
           ON CONFLICT (task_id) DO NOTHING`,
          [
            task.taskId,
            missionId,
            task.parentTaskId ?? null,
            task.agentId,
            task.title,
            task.dependsOn.length === 0 ? 'READY' : 'PENDING',
            JSON.stringify(task.dependsOn),
            JSON.stringify(task.input),
            task.maxAttempts,
          ],
        );
      }

      return this.list(missionId, client);
    });
  }

  async list(missionId: string, client?: { query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }> }): Promise<readonly MissionTask[]> {
    const runner = client ?? this.db;
    const result = await runner.query<TaskRow>(
      'SELECT task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts FROM ai_mission_tasks WHERE mission_id = $1 ORDER BY created_at, task_id',
      [missionId],
    );
    return result.rows.map((row) => this.map(row));
  }

  async claimReady(
    missionId: string,
    limit: number,
  ): Promise<readonly MissionTask[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 64) {
      throw new Error('Task claim limit must be between 1 and 64');
    }

    return this.db.transaction(async (client) => {
      const result = await client.query<TaskRow>(
        `SELECT t.task_id, t.mission_id, t.parent_task_id, t.agent_id, t.title, t.status,
                t.depends_on, t.input_json, t.output_json, t.attempt_count, t.max_attempts
           FROM ai_mission_tasks t
          WHERE t.mission_id = $1
            AND t.status = 'READY'
            AND NOT EXISTS (
              SELECT 1
                FROM ai_mission_tasks d
               WHERE d.task_id = ANY(
                 SELECT jsonb_array_elements_text(t.depends_on)
               )
                 AND d.status <> 'COMPLETED'
            )
          ORDER BY t.created_at, t.task_id
          FOR UPDATE SKIP LOCKED
          LIMIT $2`,
        [missionId, limit],
      );

      const claimed: MissionTask[] = [];
      for (const row of result.rows) {
        const updated = await client.query<TaskRow>(
          `UPDATE ai_mission_tasks
              SET status = 'RUNNING', attempt_count = attempt_count + 1, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
            WHERE task_id = $1 AND status = 'READY'
          RETURNING task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts`,
          [row.task_id],
        );
        const claimedRow = updated.rows[0];
        if (!claimedRow) continue;
        await client.query(
          'INSERT INTO ai_mission_task_events (task_id, from_status, to_status, event_type) VALUES ($1,$2,$3,$4)',
          [row.task_id, 'READY', 'RUNNING', 'TASK_CLAIMED'],
        );
        claimed.push(this.map(claimedRow));
      }
      return claimed;
    });
  }

  async complete(
    taskId: string,
    output: Record<string, unknown>,
  ): Promise<MissionTask> {
    return this.transition(taskId, 'RUNNING', 'COMPLETED', 'TASK_COMPLETED', output);
  }

  async fail(
    taskId: string,
    output: Record<string, unknown>,
  ): Promise<MissionTask> {
    return this.db.transaction(async (client) => {
      const current = await client.query<TaskRow>(
        'SELECT task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts FROM ai_mission_tasks WHERE task_id = $1 FOR UPDATE',
        [taskId],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('Mission task not found');
      if (row.status !== 'RUNNING') throw new Error(`Task state conflict: expected RUNNING, got ${row.status}`);

      const next: MissionTaskStatus = row.attempt_count < row.max_attempts ? 'READY' : 'FAILED';
      const updated = await client.query<TaskRow>(
        `UPDATE ai_mission_tasks
            SET status = $2, output_json = $3::jsonb, updated_at = NOW(), completed_at = CASE WHEN $2 = 'FAILED' THEN NOW() ELSE completed_at END
          WHERE task_id = $1
          RETURNING task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts`,
        [taskId, next, JSON.stringify(output)],
      );
      await client.query(
        'INSERT INTO ai_mission_task_events (task_id, from_status, to_status, event_type, payload_json) VALUES ($1,$2,$3,$4,$5::jsonb)',
        [taskId, 'RUNNING', next, next === 'READY' ? 'TASK_RETRY_SCHEDULED' : 'TASK_FAILED', JSON.stringify(output)],
      );
      const updatedRow = updated.rows[0];
      if (!updatedRow) throw new Error('Task update failed');
      return this.map(updatedRow);
    });
  }

  async cancel(taskId: string): Promise<MissionTask> {
    return this.transition(taskId, undefined, 'CANCELLED', 'TASK_CANCELLED');
  }

  async refreshReadyTasks(missionId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE ai_mission_tasks t
          SET status = 'READY', updated_at = NOW()
        WHERE t.mission_id = $1
          AND t.status = 'PENDING'
          AND NOT EXISTS (
            SELECT 1
              FROM ai_mission_tasks d
             WHERE d.task_id = ANY(SELECT jsonb_array_elements_text(t.depends_on))
               AND d.status <> 'COMPLETED'
          )`,
      [missionId],
    );
    return result.rowCount ?? 0;
  }

  private async transition(
    taskId: string,
    expected: MissionTaskStatus | undefined,
    next: MissionTaskStatus,
    eventType: string,
    output?: Record<string, unknown>,
  ): Promise<MissionTask> {
    return this.db.transaction(async (client) => {
      const current = await client.query<TaskRow>(
        'SELECT task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts FROM ai_mission_tasks WHERE task_id = $1 FOR UPDATE',
        [taskId],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('Mission task not found');
      if (expected !== undefined && row.status !== expected) {
        throw new Error(`Task state conflict: expected ${expected}, got ${row.status}`);
      }
      const updated = await client.query<TaskRow>(
        `UPDATE ai_mission_tasks
            SET status = $2, output_json = COALESCE($3::jsonb, output_json), completed_at = CASE WHEN $2 IN ('COMPLETED','FAILED','CANCELLED') THEN NOW() ELSE completed_at END, updated_at = NOW()
          WHERE task_id = $1
          RETURNING task_id, mission_id, parent_task_id, agent_id, title, status, depends_on, input_json, output_json, attempt_count, max_attempts`,
        [taskId, next, output ? JSON.stringify(output) : null],
      );
      await client.query(
        'INSERT INTO ai_mission_task_events (task_id, from_status, to_status, event_type, payload_json) VALUES ($1,$2,$3,$4,$5::jsonb)',
        [taskId, row.status, next, eventType, JSON.stringify(output ?? {})],
      );
      const updatedRow = updated.rows[0];
      if (!updatedRow) throw new Error('Task update failed');
      return this.map(updatedRow);
    });
  }

  private map(row: TaskRow): MissionTask {
    const dependencies = Array.isArray(row.depends_on)
      ? row.depends_on.filter((value): value is string => typeof value === 'string')
      : [];
    return {
      taskId: row.task_id,
      missionId: row.mission_id,
      parentTaskId: row.parent_task_id ?? undefined,
      agentId: row.agent_id,
      title: row.title,
      status: row.status,
      dependsOn: dependencies,
      input: row.input_json ?? {},
      output: row.output_json ?? undefined,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
    };
  }
}
