import { AgentAccessLevel, AgentTeamDefinition } from './agent.types';

export type MissionStatus = 'PLANNED' | 'RUNNING' | 'WAITING_APPROVAL' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface MissionRequest {
  readonly missionId: string;
  readonly objective: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly accessLevel: AgentAccessLevel;
  readonly requiredSkills?: readonly string[];
  readonly preferredFamilies?: readonly string[];
  readonly executionMode?: 'ADVISORY' | 'EXECUTION' | 'AUTONOMOUS';
}

export interface MissionPlan {
  readonly missionId: string;
  readonly objective: string;
  readonly team: AgentTeamDefinition;
  readonly phases: readonly string[];
}

export interface MissionState {
  readonly missionId: string;
  readonly status: MissionStatus;
  readonly plan: MissionPlan;
}
