import { Injectable } from '@nestjs/common';
import { AgentFactoryService } from './agent-factory.service';
import { AgentRegistryService } from './agent-registry.service';
import { MissionPlan, MissionRequest, MissionState } from './mission.types';

@Injectable()
export class MissionOrchestratorService {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly factory: AgentFactoryService,
  ) {}

  plan(request: MissionRequest): MissionState {
    if (request.accessLevel === 'STANDARD' && request.executionMode === 'AUTONOMOUS') {
      throw new Error('Autonomous missions require OWNER access');
    }
    if (!request.tenantId || !request.userId) throw new Error('Mission requires authenticated tenant and user context');
    if ((request.maxAgents ?? 1) < 1 || (request.maxAgents ?? 1) > (request.accessLevel === 'OWNER' ? 32 : 16)) {
      throw new Error('Mission maxAgents is outside the permitted range');
    }
    const candidates = this.registry.select({
      requiredSkills: request.requiredSkills,
      accessLevel: request.accessLevel,
      executionMode: request.executionMode,
      limit: Math.min(request.maxAgents ?? (request.accessLevel === 'OWNER' ? 16 : 8), request.accessLevel === 'OWNER' ? 32 : 16),
    });
    if (candidates.length === 0) throw new Error('No eligible specialist agents found');

    const members = candidates.map((agent) => ({
      agentId: agent.id,
      responsibility: agent.description,
    }));
    const team = {
      id: `team:${request.missionId}`,
      missionId: request.missionId,
      objective: request.objective,
      members,
    } as const;
    const plan: MissionPlan = {
      missionId: request.missionId,
      objective: request.objective,
      team,
      phases: ['REQUIREMENTS', 'PLANNING', 'DELEGATION', 'EXECUTION', 'VERIFICATION', 'DELIVERY'],
    };
    return { missionId: request.missionId, status: 'PLANNED', plan };
  }

  instantiateTeam(state: MissionState) {
    const mode = state.plan.team.members.length > 1 ? 'EXECUTION' : 'ADVISORY';
    return state.plan.team.members.map((member) => this.factory.create(member.agentId, {
      executionMode: mode,
      missionId: state.missionId,
    }));
  }
}
