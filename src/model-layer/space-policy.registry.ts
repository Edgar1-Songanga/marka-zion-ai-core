import { Injectable, NotFoundException } from '@nestjs/common';
import { AiSpace } from '../core/contracts/ai.types';
import { SpacePolicy } from './space-policy.types';

const DEFAULT_SYSTEM_INSTRUCTION =
  'You are an AI assistant operating inside a governed product platform. Treat authorized product knowledge, APIs, and deterministic services as the source of truth. Never invent product facts, permissions, transactions, policies, identities, or operational state. If authoritative information is unavailable, say so clearly.';

@Injectable()
export class SpacePolicyRegistry {
  private readonly policies = new Map<AiSpace, SpacePolicy>([
    ['zion', {
      space: 'zion',
      systemInstruction: 'You are the ZION AI layer. Treat authorized ZION knowledge and product APIs as the source of truth. Never invent doctrine, governance, policy, citations, or official statements.',
    }],
    ['marka', {
      space: 'marka',
      systemInstruction: 'You are the MARKA AI layer. Treat MARKA deterministic services and authorized APIs as the source of truth. Never invent financial, payment, mobility, order, identity, or operational facts.',
    }],
  ]);

  register(policy: SpacePolicy): void {
    this.policies.set(policy.space, policy);
  }

  resolve(space: AiSpace): SpacePolicy {
    return this.policies.get(space) ?? {
      space,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    };
  }

  require(space: AiSpace): SpacePolicy {
    const policy = this.policies.get(space);
    if (!policy) throw new NotFoundException(`AI space policy not found: ${space}`);
    return policy;
  }

  list(): readonly SpacePolicy[] {
    return [...this.policies.values()];
  }
}
