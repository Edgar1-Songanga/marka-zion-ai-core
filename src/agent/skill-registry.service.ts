import { Injectable } from '@nestjs/common';

export interface SkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly description: string;
  readonly requiredCapabilities: readonly string[];
}

const SKILLS: readonly SkillDefinition[] = [
  { id: 'strategy', name: 'Strategy', family: 'direction', description: 'Strategic analysis and planning.', requiredCapabilities: ['research', 'plan'] },
  { id: 'economics', name: 'Economics', family: 'economics', description: 'Economic reasoning and scenario analysis.', requiredCapabilities: ['research', 'model'] },
  { id: 'financial-modeling', name: 'Financial Modeling', family: 'finance', description: 'Financial models, scenarios and forecasts.', requiredCapabilities: ['model', 'forecast'] },
  { id: 'business-analysis', name: 'Business Analysis', family: 'business', description: 'Business requirements and process analysis.', requiredCapabilities: ['research', 'specify'] },
  { id: 'market-research', name: 'Market Research', family: 'business', description: 'Market and competitor research.', requiredCapabilities: ['research', 'compare'] },
  { id: 'product-management', name: 'Product Management', family: 'product', description: 'Product discovery, requirements and prioritization.', requiredCapabilities: ['specify', 'prioritize'] },
  { id: 'graphic-design', name: 'Graphic Design', family: 'design', description: 'Visual composition and communication design.', requiredCapabilities: ['design', 'review'] },
  { id: 'data-visualization', name: 'Data Visualization', family: 'design', description: 'Charts, infographics and information visualization.', requiredCapabilities: ['design', 'visualize'] },
  { id: 'software-architecture', name: 'Software Architecture', family: 'engineering', description: 'Architecture and technical design.', requiredCapabilities: ['architect', 'review'] },
  { id: 'backend-engineering', name: 'Backend Engineering', family: 'engineering', description: 'Backend services and APIs.', requiredCapabilities: ['code', 'test', 'debug'] },
  { id: 'frontend-engineering', name: 'Frontend Engineering', family: 'engineering', description: 'Frontend applications and interfaces.', requiredCapabilities: ['code', 'test', 'debug'] },
  { id: 'iot', name: 'IoT', family: 'engineering', description: 'Connected-device architecture and operations.', requiredCapabilities: ['architect', 'design'] },
  { id: 'application-security', name: 'Application Security', family: 'security', description: 'Threat modeling and secure engineering.', requiredCapabilities: ['threat-model', 'audit'] },
  { id: 'research', name: 'Research', family: 'science', description: 'Evidence-based research and synthesis.', requiredCapabilities: ['research', 'verify'] },
  { id: 'statistics', name: 'Statistics', family: 'science', description: 'Statistical reasoning and experimental analysis.', requiredCapabilities: ['analyze', 'experiment'] },
  { id: 'tutoring', name: 'Tutoring', family: 'education', description: 'Adaptive instruction and assessment.', requiredCapabilities: ['teach', 'assess'] },
  { id: 'compliance', name: 'Compliance', family: 'governance', description: 'Controls and policy compliance.', requiredCapabilities: ['research', 'audit'] },
  { id: 'growth', name: 'Growth', family: 'marketing', description: 'Acquisition and conversion optimization.', requiredCapabilities: ['experiment', 'optimize'] },
  { id: 'evaluation', name: 'Evaluation', family: 'meta', description: 'Agent quality and reliability evaluation.', requiredCapabilities: ['evaluate', 'score'] },
  { id: 'agent-training', name: 'Agent Training', family: 'meta', description: 'Reusable skill and policy improvement.', requiredCapabilities: ['analyze', 'train'] },
];

@Injectable()
export class SkillRegistryService {
  private readonly skills = new Map(SKILLS.map((skill) => [skill.id, skill]));

  get(skillId: string): SkillDefinition {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Unknown skill: ${skillId}`);
    return skill;
  }

  list(): readonly SkillDefinition[] { return [...this.skills.values()]; }
}
