export type AgentAccessLevel = 'STANDARD' | 'OWNER';

export type AgentFamily =
  | 'DIRECTION_STRATEGY'
  | 'ECONOMICS_FINANCE'
  | 'BUSINESS'
  | 'PRODUCT'
  | 'DESIGN_COMMUNICATION'
  | 'ENGINEERING'
  | 'SCIENCE_RESEARCH'
  | 'EDUCATION'
  | 'LEGAL_COMPLIANCE'
  | 'MARKETING'
  | 'HUMAN_RESOURCES'
  | 'INDUSTRY'
  | 'META_TRAINING';

export type AgentExecutionMode = 'ADVISORY' | 'EXECUTION' | 'AUTONOMOUS';

export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly family: AgentFamily;
  readonly description: string;
  readonly skills: readonly string[];
  readonly capabilities: readonly string[];
  readonly tools: readonly string[];
  readonly defaultModelPolicy: string;
  readonly accessLevels: readonly AgentAccessLevel[];
  readonly executionModes: readonly AgentExecutionMode[];
  readonly supervisorRole?: string;
}

export interface AgentSelectionRequest {
  readonly objective: string;
  readonly requiredSkills?: readonly string[];
  readonly preferredFamilies?: readonly AgentFamily[];
  readonly executionMode?: AgentExecutionMode;
  readonly accessLevel: AgentAccessLevel;
  readonly limit?: number;
}

export interface AgentTeamMember {
  readonly agentId: string;
  readonly responsibility: string;
  readonly supervisorAgentId?: string;
}

export interface AgentTeamDefinition {
  readonly id: string;
  readonly missionId: string;
  readonly objective: string;
  readonly members: readonly AgentTeamMember[];
}
