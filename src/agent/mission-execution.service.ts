import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { MissionOrchestratorService } from './mission-orchestrator.service';
import { MissionRepositoryService } from './mission-repository.service';
import { MissionTask, MissionTaskRepositoryService } from './mission-task-repository.service';
import { MissionRequest, MissionState } from './mission.types';

export interface MissionExecutionResult {
  readonly missionId: string;
  readonly status: MissionState['status'];
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly pendingTasks: number;
  readonly outputs: readonly Record<string, unknown>[];
}

@Injectable()
export class MissionExecutionService {
  constructor(
    private readonly missions: MissionOrchestratorService,
    private readonly missionRepository: MissionRepositoryService,
    private readonly tasks: MissionTaskRepositoryService,
    private readonly agent: AgentOrchestratorService,
  ) {}

  async prepare(request: MissionRequest): Promise<MissionState> {
    const state = await this.missions.create(request);
    const maxAttempts = request.accessLevel === 'OWNER' ? 3 : 2;

    const graph = state.plan.team.members.map((member) => ({
      taskId: randomUUID(),
      missionId: state.missionId,
      agentId: member.agentId,
      title: member.responsibility,
      parentTaskId: undefined,
      dependsOn: [] as readonly string[],
      input: {
        objective: state.plan.objective,
        responsibility: member.responsibility,
      },
      maxAttempts,
    }));

    await this.tasks.createMany(state.missionId, graph);
    await this.missionRepository.checkpoint(state.missionId, request.tenantId, {
      phase: 'PLANNING',
      data: { taskCount: graph.length },
      updatedAt: new Date().toISOString(),
    });

    return state;
  }

  async run(
    missionId: string,
    tenantId: string,
    userId: string,
    concurrency = 4,
  ): Promise<MissionExecutionResult> {
    const state = await this.missions.resumeOrStart(missionId, tenantId, userId);
    const limit = state.plan.accessLevel === 'OWNER' ? 16 : 8;
    const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), limit);

    await this.tasks.refreshReadyTasks(missionId);

    const outputs: Record<string, unknown>[] = [];
    let completedTasks = 0;
    let failedTasks = 0;

    while (true) {
      const claimed = await this.tasks.claimReady(missionId, workerCount);
      if (claimed.length === 0) {
        const all = await this.tasks.list(missionId);
        const pending = all.filter((task) =>
          task.status === 'PENDING' ||
          task.status === 'READY' ||
          task.status === 'RUNNING' ||
          task.status === 'WAITING_APPROVAL' ||
          task.status === 'VERIFYING',
        ).length;

        if (pending > 0) {
          if (all.some((task) => task.status === 'FAILED')) {
            await this.missions.fail(missionId, tenantId, userId, 'TASK_FAILURE');
            return { missionId, status: 'FAILED', completedTasks, failedTasks, pendingTasks: pending, outputs };
          }
          await this.missionRepository.checkpoint(missionId, tenantId, {
            phase: 'EXECUTION',
            data: { waiting: true, pendingTasks: pending },
            updatedAt: new Date().toISOString(),
          });
          return { missionId, status: state.status, completedTasks, failedTasks, pendingTasks: pending, outputs };
        }

        await this.missions.complete(missionId, tenantId, userId);
        return { missionId, status: 'COMPLETED', completedTasks, failedTasks, pendingTasks: 0, outputs };
      }

      const results = await Promise.all(
        claimed.map((task) => this.executeTask(task, state, tenantId, userId)),
      );

      for (const result of results) {
        if (result.ok) {
          completedTasks += 1;
          outputs.push(result.output);
        } else if (result.failed) {
          failedTasks += 1;
        }
      }

      await this.tasks.refreshReadyTasks(missionId);
      await this.missionRepository.checkpoint(missionId, tenantId, {
        phase: 'EXECUTION',
        taskId: claimed[claimed.length - 1]?.taskId,
        data: { completedTasks, failedTasks },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private async executeTask(
    task: MissionTask,
    state: MissionState,
    tenantId: string,
    userId: string,
  ): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; failed: boolean }> {
    try {
      const result = await this.agent.run({
        operation: 'CHAT',
        input: JSON.stringify(task.input),
        space: 'agent-mission',
        context: {
          tenantId,
          userId,
          roles: [],
          accessLevel: state.plan.accessLevel,
          correlationId: state.missionId,
          requestId: `mission:${state.missionId}:task:${task.taskId}`,
        },
      });

      const output = {
        status: 'COMPLETED',
        text: result.text,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
      await this.missionRepository.consumeTokens(
        state.missionId,
        tenantId,
        result.inputTokens + result.outputTokens,
      );
      await this.tasks.complete(task.taskId, output);
      return { ok: true, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mission task failure';
      const taskResult = await this.tasks.fail(task.taskId, {
        status: 'ERROR',
        message: message.slice(0, 1000),
      });
      return { ok: false, failed: taskResult.status === 'FAILED' };
    }
  }
}
