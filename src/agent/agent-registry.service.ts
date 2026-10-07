import { Injectable } from '@nestjs/common';
import { AgentDefinition, AgentFamily } from './agent.types';

const AGENTS: readonly AgentDefinition[] = [
  { id: 'direction.ceo', name: 'CEO Agent', family: 'DIRECTION_STRATEGY', description: 'Executive direction, priorities and final trade-off analysis.', skills: ['executive-decision-making', 'strategy'], capabilities: ['plan', 'prioritize', 'delegate', 'review'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'] },
  { id: 'direction.strategy', name: 'Chief Strategy Agent', family: 'DIRECTION_STRATEGY', description: 'Corporate strategy, competitive positioning and long-horizon planning.', skills: ['strategy', 'competitive-intelligence'], capabilities: ['research', 'plan', 'model'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'] },
  { id: 'economics.economist', name: 'Economist Agent', family: 'ECONOMICS_FINANCE', description: 'Economic analysis, incentives, markets and scenario modeling.', skills: ['economics', 'forecasting'], capabilities: ['research', 'model', 'forecast'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'finance.analyst', name: 'Financial Analyst Agent', family: 'ECONOMICS_FINANCE', description: 'Financial analysis, statements, unit economics and investment analysis.', skills: ['financial-analysis', 'financial-modeling'], capabilities: ['analyze', 'model', 'forecast'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'finance.pricing', name: 'Pricing Agent', family: 'ECONOMICS_FINANCE', description: 'Pricing, revenue management and willingness-to-pay analysis.', skills: ['pricing', 'revenue-management'], capabilities: ['analyze', 'model', 'optimize'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'business.analyst', name: 'Business Analyst Agent', family: 'BUSINESS', description: 'Requirements, processes, business cases and operational analysis.', skills: ['business-analysis', 'process-analysis'], capabilities: ['research', 'specify', 'model'], tools: [], defaultModelPolicy: 'balanced', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'business.market-research', name: 'Market Research Agent', family: 'BUSINESS', description: 'Market sizing, customer research and competitive intelligence.', skills: ['market-research', 'competitive-intelligence'], capabilities: ['research', 'compare', 'forecast'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'product.manager', name: 'Product Manager Agent', family: 'PRODUCT', description: 'Product requirements, roadmap, prioritization and acceptance criteria.', skills: ['product-management', 'requirements'], capabilities: ['specify', 'prioritize', 'review'], tools: [], defaultModelPolicy: 'balanced', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'] },
  { id: 'design.graphic', name: 'Graphic Designer Agent', family: 'DESIGN_COMMUNICATION', description: 'Visual communication, layouts, brand assets and production-ready design direction.', skills: ['graphic-design', 'visual-design'], capabilities: ['design', 'art-direct', 'review'], tools: [], defaultModelPolicy: 'creative', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'design.data-visualization', name: 'Data Visualization Designer Agent', family: 'DESIGN_COMMUNICATION', description: 'Charts, dashboards, infographics and visual encoding of complex data.', skills: ['data-visualization', 'information-design'], capabilities: ['design', 'visualize', 'review'], tools: [], defaultModelPolicy: 'creative', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'design.art-director', name: 'Art Director Agent', family: 'DESIGN_COMMUNICATION', description: 'Creative direction, visual systems and premium brand coherence.', skills: ['art-direction', 'brand-design'], capabilities: ['direct', 'design', 'review'], tools: [], defaultModelPolicy: 'creative', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'engineering.architect', name: 'Software Architect Agent', family: 'ENGINEERING', description: 'System architecture, boundaries, scalability and technical decision records.', skills: ['software-architecture', 'distributed-systems'], capabilities: ['architect', 'design', 'review'], tools: ['github', 'filesystem'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'], supervisorRole: 'engineering.director' },
  { id: 'engineering.backend', name: 'Backend Engineer Agent', family: 'ENGINEERING', description: 'Production backend implementation, APIs, data access and services.', skills: ['backend-engineering', 'api-engineering'], capabilities: ['code', 'test', 'debug'], tools: ['github', 'shell'], defaultModelPolicy: 'coding', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['EXECUTION', 'AUTONOMOUS'] },
  { id: 'engineering.frontend', name: 'Frontend Engineer Agent', family: 'ENGINEERING', description: 'Production frontend implementation, accessibility and performance.', skills: ['frontend-engineering', 'accessibility'], capabilities: ['code', 'test', 'debug'], tools: ['github', 'shell', 'browser'], defaultModelPolicy: 'coding', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['EXECUTION', 'AUTONOMOUS'] },
  { id: 'engineering.iot', name: 'IoT Architect Agent', family: 'ENGINEERING', description: 'End-to-end IoT architecture spanning devices, firmware, connectivity, cloud and operations.', skills: ['iot', 'distributed-systems'], capabilities: ['architect', 'design', 'review'], tools: ['github', 'shell'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'] },
  { id: 'engineering.security', name: 'Security Engineer Agent', family: 'ENGINEERING', description: 'Application, infrastructure and supply-chain security engineering.', skills: ['application-security', 'threat-modeling'], capabilities: ['threat-model', 'audit', 'test'], tools: ['github', 'shell'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'science.researcher', name: 'Research Agent', family: 'SCIENCE_RESEARCH', description: 'Structured research, evidence synthesis and source verification.', skills: ['research', 'literature-review'], capabilities: ['research', 'synthesize', 'verify'], tools: ['browser'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'science.data-scientist', name: 'Data Scientist Agent', family: 'SCIENCE_RESEARCH', description: 'Statistical analysis, experimentation and predictive modeling.', skills: ['data-science', 'statistics'], capabilities: ['analyze', 'model', 'experiment'], tools: ['python'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'education.tutor', name: 'General Tutor Agent', family: 'EDUCATION', description: 'Adaptive tutoring, diagnostics, exercises and mastery progression.', skills: ['tutoring', 'curriculum-design'], capabilities: ['teach', 'assess', 'adapt'], tools: [], defaultModelPolicy: 'tutoring', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'education.programming', name: 'Programming Tutor Agent', family: 'EDUCATION', description: 'Programming instruction, exercises, debugging guidance and assessments.', skills: ['programming', 'tutoring'], capabilities: ['teach', 'assess', 'debug'], tools: ['shell'], defaultModelPolicy: 'tutoring', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'legal.compliance', name: 'Compliance Agent', family: 'LEGAL_COMPLIANCE', description: 'Compliance controls, policy mapping and regulatory research support.', skills: ['compliance', 'regulatory-research'], capabilities: ['research', 'map', 'audit'], tools: ['browser'], defaultModelPolicy: 'reasoning', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'marketing.growth', name: 'Growth Agent', family: 'MARKETING', description: 'Growth strategy, experiments, acquisition and conversion optimization.', skills: ['growth', 'conversion-optimization'], capabilities: ['research', 'experiment', 'optimize'], tools: ['browser'], defaultModelPolicy: 'balanced', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION', 'AUTONOMOUS'] },
  { id: 'hr.talent', name: 'Talent Development Agent', family: 'HUMAN_RESOURCES', description: 'Workforce capability, training and talent development planning.', skills: ['talent-development', 'training'], capabilities: ['assess', 'plan', 'teach'], tools: [], defaultModelPolicy: 'balanced', accessLevels: ['STANDARD', 'OWNER'], executionModes: ['ADVISORY', 'EXECUTION'] },
  { id: 'meta.evaluator', name: 'Reasoning Evaluator Agent', family: 'META_TRAINING', description: 'Evaluates agent outputs, failure modes, reliability and quality.', skills: ['evaluation', 'red-teaming'], capabilities: ['evaluate', 'red-team', 'score'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['OWNER'], executionModes: ['EXECUTION', 'AUTONOMOUS'] },
  { id: 'meta.trainer', name: 'Agent Trainer Agent', family: 'META_TRAINING', description: 'Turns validated mission outcomes into reusable skills, policies and evaluation cases.', skills: ['agent-training', 'skill-engineering'], capabilities: ['analyze', 'train', 'evaluate'], tools: [], defaultModelPolicy: 'reasoning', accessLevels: ['OWNER'], executionModes: ['EXECUTION', 'AUTONOMOUS'] },
] as const;

@Injectable()
export class AgentRegistryService {
  private readonly agents = new Map(AGENTS.map((agent) => [agent.id, agent]));

  get(agentId: string): AgentDefinition {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);
    return agent;
  }

  list(): readonly AgentDefinition[] { return [...this.agents.values()]; }

  listByFamily(family: AgentFamily): readonly AgentDefinition[] {
    return this.list().filter((agent) => agent.family === family);
  }

  select(input: { requiredSkills?: readonly string[]; preferredFamilies?: readonly AgentFamily[]; accessLevel: 'STANDARD' | 'OWNER'; executionMode?: 'ADVISORY' | 'EXECUTION' | 'AUTONOMOUS'; limit?: number }): readonly AgentDefinition[] {
    const skills = new Set(input.requiredSkills ?? []);
    const candidates = this.list()
      .filter((agent) => agent.accessLevels.includes(input.accessLevel))
      .filter((agent) => !input.executionMode || agent.executionModes.includes(input.executionMode))
      .filter((agent) => skills.size === 0 || [...skills].some((skill) => agent.skills.includes(skill)))
      .sort((a, b) => this.score(b, input) - this.score(a, input));
    return candidates.slice(0, Math.max(1, Math.min(input.limit ?? 8, 32)));
  }

  private score(agent: AgentDefinition, input: { requiredSkills?: readonly string[]; preferredFamilies?: readonly AgentFamily[] }): number {
    const skillScore = (input.requiredSkills ?? []).filter((skill) => agent.skills.includes(skill)).length * 10;
    const familyScore = input.preferredFamilies?.includes(agent.family) ? 5 : 0;
    return skillScore + familyScore;
  }
}
