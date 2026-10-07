import { AgentAccessLevel, AgentTeamDefinition } from './agent.types';

export type MissionStatus =
  | 'PLANNED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MissionExecutionMode = 'ADVISORY' | 'EXECUTION' | 'AUTONOMOUS';

export interface MissionRequest {
  readonly missionId: string;
  readonly space: string;
  readonly objective: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly accessLevel: AgentAccessLevel;
  readonly requiredSkills?: readonly string[];
  readonly preferredFamilies?: readonly string[];
  readonly maxAgents?: number;
  readonly maxBudgetTokens?: number;
  readonly executionMode?: MissionExecutionMode;
}

export interface MissionPlan {
  readonly missionId: string;
  readonly objective: string;
  readonly team: AgentTeamDefinition;
  readonly phases: readonly string[];
  readonly accessLevel: AgentAccessLevel;
  readonly executionMode: MissionExecutionMode;
  readonly budgetTokens?: number;
}

export interface MissionState {
  readonly missionId: string;
  readonly status: MissionStatus;
  readonly plan: MissionPlan;
}
