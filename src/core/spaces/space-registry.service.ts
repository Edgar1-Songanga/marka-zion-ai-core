import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ProductSpace, ProductSpaceId } from '../contracts/tenant.types';
import { PostgresService } from '../../infrastructure/postgres/postgres.service';

interface SpaceRow {
  readonly id: string;
  readonly display_name: string;
  readonly status: ProductSpace['status'];
  readonly capabilities: readonly string[];
}

@Injectable()
export class SpaceRegistryService implements OnModuleInit {
  private readonly spaces = new Map<ProductSpaceId, ProductSpace>([
    [
      'zion',
      {
        id: 'zion',
        displayName: 'ZION',
        status: 'ACTIVE',
        capabilities: ['knowledge', 'memory', 'tools'],
      },
    ],
    [
      'marka',
      {
        id: 'marka',
        displayName: 'MARKA',
        status: 'ACTIVE',
        capabilities: ['knowledge', 'memory', 'tools'],
      },
    ],
  ]);

  constructor(private readonly db: PostgresService) {}

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      return;
    }

    await this.db.query(
      `INSERT INTO ai_product_spaces
        (id, display_name, status, capabilities)
       VALUES
        ('zion', 'ZION', 'ACTIVE', $1),
        ('marka', 'MARKA', 'ACTIVE', $1)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(['knowledge', 'memory', 'tools'])],
    );

    const result = await this.db.query<SpaceRow>(
      `SELECT id, display_name, status, capabilities
       FROM ai_product_spaces`,
    );

    for (const row of result.rows) {
      this.spaces.set(row.id, {
        id: row.id,
        displayName: row.display_name,
        status: row.status,
        capabilities: row.capabilities ?? [],
      });
    }
  }

  async register(space: ProductSpace): Promise<void> {
    if (!space.id.trim() || space.id.length > 128) {
      throw new Error('Product space id must contain 1-128 characters');
    }

    if (!space.displayName.trim() || space.displayName.length > 200) {
      throw new Error('Product space display name is invalid');
    }

    this.spaces.set(space.id, space);

    if (!process.env.DATABASE_URL) {
      return;
    }

    await this.db.query(
      `INSERT INTO ai_product_spaces
        (id, display_name, status, capabilities, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         status = EXCLUDED.status,
         capabilities = EXCLUDED.capabilities,
         updated_at = NOW()`,
      [
        space.id,
        space.displayName,
        space.status,
        JSON.stringify(space.capabilities),
      ],
    );
  }

  resolve(spaceId: ProductSpaceId): ProductSpace {
    const space = this.spaces.get(spaceId);

    if (!space) {
      throw new NotFoundException(
        `AI product space not found: ${spaceId}`,
      );
    }

    return space;
  }

  list(): readonly ProductSpace[] {
    return [...this.spaces.values()];
  }
}
