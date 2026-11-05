import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AgentRegistryService } from './agent-registry.service';

describe('Global Travel specialist agents', () => {
  const registry = new AgentRegistryService();

  it('selects the visa analyst for visa research missions', () => {
    const agents = registry.select({
      requiredSkills: ['visa-research'],
      accessLevel: 'STANDARD',
      executionMode: 'ADVISORY',
    });

    assert.ok(agents.some((agent) => agent.id === 'travel.visa-analyst'));
  });

  it('keeps travel specialists in advisory mode only', () => {
    const travelAgents = registry.list().filter((agent) => agent.id.startsWith('travel.'));

    assert.ok(travelAgents.length >= 5);
    for (const agent of travelAgents) {
      assert.deepEqual(agent.executionModes, ['ADVISORY']);
    }
  });

  it('selects the concierge for end-to-end trip planning', () => {
    const agents = registry.select({
      requiredSkills: ['travel-planning'],
      accessLevel: 'STANDARD',
      executionMode: 'ADVISORY',
    });

    assert.equal(agents[0]?.id, 'travel.concierge');
  });
});
