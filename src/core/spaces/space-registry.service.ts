import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductSpace, ProductSpaceId } from '../contracts/tenant.types';

@Injectable()
export class SpaceRegistryService {
  private readonly spaces = new Map<ProductSpaceId, ProductSpace>([
    ['zion', {
      id: 'zion',
      displayName: 'ZION',
      status: 'ACTIVE',
      capabilities: ['knowledge', 'memory', 'tools'],
    }],
    ['marka', {
      id: 'marka',
      displayName: 'MARKA',
      status: 'ACTIVE',
      capabilities: ['knowledge', 'memory', 'tools'],
    }],
  ]);

  register(space: ProductSpace): void {
    this.spaces.set(space.id, space);
  }

  resolve(spaceId: ProductSpaceId): ProductSpace {
    const space = this.spaces.get(spaceId);
    if (!space) throw new NotFoundException(`AI product space not found: ${spaceId}`);
    return space;
  }

  list(): readonly ProductSpace[] {
    return [...this.spaces.values()];
  }
}
