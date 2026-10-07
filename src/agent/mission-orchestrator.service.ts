import { Injectable } from '@nestjs/common';
import { AgentFactoryService } from './agent-factory.service';
import { AgentRegistryService } from './agent-registry.service';
import { MissionPlan, MissionRequest, MissionState } from './mission.types';
import { MissionRepositoryService } from './mission-repository.service';

@Injectable()
export class MissionOrchestratorService {
  constructor(private readonly registry: AgentRegistryService, private readonly factory: AgentFactoryService, private readonly repository: MissionRepositoryService) {}

  plan(request: MissionRequest): MissionState {
    this.validateRequest(request);
    const mode = request.executionMode ?? 'ADVISORY';
    const candidates = this.registry.select({
      requiredSkills: request.requiredSkills,
      accessLevel: request.accessLevel,
      executionMode: mode,
      limit: Math.min(request.maxAgents ?? (request.accessLevel === 'OWNER' ? 16 : 8), request.accessLevel === 'OWNER' ? 32 : 16),
    });
    if (candidates.length === 0) throw new Error('No eligible specialist agents found');

    const team = {
      id: `team:${request.missionId}`,
      missionId: request.missionId,
      space: request.space,
      objective: request.objective,
      members: candidates.map((agent) => ({ agentId: agent.id, responsibility: agent.description })),
    } as const;

    const plan: MissionPlan = {
      missionId: request.missionId,
      objective: request.objective,
      team,
      phases: ['REQUIREMENTS', 'PLANNING', 'DELEGATION', 'EXECUTION', 'VERIFICATION', 'DELIVERY'],
      accessLevel: request.accessLevel,
      executionMode: mode,
      budgetTokens: request.maxBudgetTokens,
    };
    return { missionId: request.missionId, status: 'PLANNED', plan };
  }

  async create(request: MissionRequest): Promise<MissionState> {
    const state = this.plan(request);
    return this.repository.create(state, {
      tenantId: request.tenantId,
      userId: request.userId,
      accessLevel: request.accessLevel,
      executionMode: state.plan.executionMode,
      budgetTokens: request.maxBudgetTokens,
    });
  }

  async start(missionId: string, tenantId: string, userId: string): Promise<MissionState> {
    const current = await this.repository.get(missionId, tenantId);
    if (current.status !== 'PLANNED') throw new Error(`Mission cannot start from ${current.status}`);
    const started = await this.repository.transition(missionId, tenantId, 'PLANNED', 'RUNNING', 'MISSION_STARTED', userId);
    await this.repository.checkpoint(missionId, tenantId, { phase: 'REQUIREMENTS', updatedAt: new Date().toISOString() });
    return started;
  }

  async resume(missionId: string, tenantId: string): Promise<MissionState> {
    const state = await this.repository.get(missionId, tenantId);
    if (state.status === 'RUNNING' || state.status === 'VERIFYING') return state;
    throw new Error(`Mission is not resumable from ${state.status}`);
  }

  async resumeOrStart(missionId: string, tenantId: string, userId: string): Promise<MissionState> {
    const state = await this.repository.get(missionId, tenantId);
    if (state.status === 'PLANNED') {
      return this.start(missionId, tenantId, userId);
    }
    if (state.status === 'RUNNING' || state.status === 'VERIFYING') return state;
    throw new Error(`Mission cannot execute from ${state.status}`);
  }

  async complete(missionId: string, tenantId: string, userId: string): Promise<MissionState> {
    const state = await this.repository.get(missionId, tenantId);
    if (state.status !== 'RUNNING' && state.status !== 'VERIFYING') {
      throw new Error(`Mission cannot complete from ${state.status}`);
    }
    return this.repository.transition(missionId, tenantId, state.status, 'COMPLETED', 'MISSION_COMPLETED', userId);
  }

  async fail(missionId: string, tenantId: string, userId: string, reason: string): Promise<MissionState> {
    const state = await this.repository.get(missionId, tenantId);
    if (state.status === 'FAILED') return state;
    if (state.status !== 'RUNNING' && state.status !== 'VERIFYING' && state.status !== 'WAITING_APPROVAL') {
      throw new Error(`Mission cannot fail from ${state.status}`);
    }
    return this.repository.transition(missionId, tenantId, state.status, 'FAILED', reason, userId);
  }

  instantiateTeam(state: MissionState) {
    return state.plan.team.members.map((member) => this.factory.create(member.agentId, {
      executionMode: state.plan.executionMode,
      missionId: state.missionId,
    }));
  }

  private validateRequest(request: MissionRequest): void {
    if (!request.missionId.trim() || request.missionId.length > 128) throw new Error('Mission ID must contain 1-128 characters');
    if (!request.space.trim() || request.space.length > 128) throw new Error('Mission space must contain 1-128 characters');
    if (!request.objective.trim() || request.objective.length > 20000) throw new Error('Mission objective must contain 1-20000 characters');
    if (request.accessLevel === 'STANDARD' && request.executionMode === 'AUTONOMOUS') throw new Error('Autonomous missions require OWNER access');
    if (!request.tenantId || !request.userId) throw new Error('Mission requires authenticated tenant and user context');

    const maxAgents = request.maxAgents ?? 1;
    const maxAllowed = request.accessLevel === 'OWNER' ? 32 : 16;
    if (!Number.isSafeInteger(maxAgents) || maxAgents < 1 || maxAgents > maxAllowed) throw new Error('Mission maxAgents is outside the permitted range');
    if (request.maxBudgetTokens !== undefined && (!Number.isSafeInteger(request.maxBudgetTokens) || request.maxBudgetTokens < 1)) throw new Error('Mission maxBudgetTokens must be a positive safe integer');
  }
}