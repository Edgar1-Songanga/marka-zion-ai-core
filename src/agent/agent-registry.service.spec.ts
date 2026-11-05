import { AgentRegistryService } from './agent-registry.service';

describe('Global Travel specialist agents', () => {
  const registry = new AgentRegistryService();

  it('selects the visa analyst for visa research missions', () => {
    const agents = registry.select({
      requiredSkills: ['visa-research'],
      accessLevel: 'STANDARD',
      executionMode: 'ADVISORY',
    });

    expect(agents.map((agent) => agent.id)).toContain('travel.visa-analyst');
  });

  it('keeps travel specialists in advisory mode only', () => {
    const travelAgents = registry.list().filter((agent) => agent.id.startsWith('travel.'));

    expect(travelAgents.length).toBeGreaterThanOrEqual(5);
    for (const agent of travelAgents) {
      expect(agent.executionModes).toEqual(['ADVISORY']);
    }
  });

  it('selects the concierge for end-to-end trip planning', () => {
    const agents = registry.select({
      requiredSkills: ['travel-planning'],
      accessLevel: 'STANDARD',
      executionMode: 'ADVISORY',
    });

    expect(agents[0]?.id).toBe('travel.concierge');
  });
});
