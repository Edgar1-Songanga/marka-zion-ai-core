import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AgentDefinition, AgentExecutionMode } from './agent.types';
import { AgentRegistryService } from './agent-registry.service';

export interface RuntimeAgent {
  readonly instanceId: string;
  readonly definition: AgentDefinition;
  readonly executionMode: AgentExecutionMode;
  readonly missionId?: string;
}

@Injectable()
export class AgentFactoryService {
  constructor(private readonly registry: AgentRegistryService) {}

  create(agentId: string, input: { executionMode?: AgentExecutionMode; missionId?: string }): RuntimeAgent {
    const definition = this.registry.get(agentId);
    const executionMode = input.executionMode ?? definition.executionModes[0] ?? 'ADVISORY';
    if (!definition.executionModes.includes(executionMode)) {
      throw new Error(`Agent ${agentId} does not support execution mode ${executionMode}`);
    }
    return {
      instanceId: `${agentId}:${randomUUID()}`,
      definition,
      executionMode,
      missionId: input.missionId,
    };
  }
}
