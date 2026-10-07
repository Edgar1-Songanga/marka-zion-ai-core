import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiSpace } from '../core/contracts/ai.types';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { MemoryRecord, MemoryStore } from './memory.types';

interface MemoryRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly space: string;
  readonly user_id: string;
  readonly conversation_id: string | null;
  readonly memory_key: string;
  readonly value: string;
  readonly created_at: Date;
  readonly expires_at: Date | null;
}

@Injectable()
export class MemoryService implements MemoryStore {
  constructor(private readonly db: PostgresService) {}

  async get(
    tenantId: string,
    userId: string,
    space: AiSpace,
    key: string,
  ): Promise<MemoryRecord | null> {
    this.requireDatabase();

    const result = await this.db.query<MemoryRow>(
      `SELECT id, tenant_id, space, user_id, conversation_id, memory_key, value,
              created_at, expires_at
       FROM ai_memory_records
       WHERE tenant_id = $1 AND space = $2 AND user_id = $3 AND memory_key = $4
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [tenantId, space, userId, key],
    );

    const row = result.rows[0];
    return row ? this.map(row) : null;
  }

  async set(record: MemoryRecord): Promise<void> {
    this.requireDatabase();

    await this.db.query(
      `INSERT INTO ai_memory_records
        (id, tenant_id, space, user_id, conversation_id, memory_key, value, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, space, user_id, memory_key)
       DO UPDATE SET
         conversation_id = EXCLUDED.conversation_id,
         value = EXCLUDED.value,
         created_at = EXCLUDED.created_at,
         expires_at = EXCLUDED.expires_at`,
      [
        record.id || randomUUID(),
        record.tenantId,
        record.space,
        record.userId,
        record.conversationId ?? null,
        record.key,
        record.value,
        record.createdAt,
        record.expiresAt ?? null,
      ],
    );
  }

  async recent(
    tenantId: string,
    userId: string,
    space: AiSpace,
    limit: number,
  ): Promise<readonly MemoryRecord[]> {
    this.requireDatabase();

    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);

    const result = await this.db.query<MemoryRow>(
      `SELECT id, tenant_id, space, user_id, conversation_id, memory_key, value,
              created_at, expires_at
       FROM ai_memory_records
       WHERE tenant_id = $1 AND space = $2 AND user_id = $3
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $4`,
      [tenantId, space, userId, safeLimit],
    );

    return result.rows.map((row) => this.map(row));
  }

  private map(row: MemoryRow): MemoryRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      space: row.space,
      userId: row.user_id,
      conversationId: row.conversation_id ?? undefined,
      key: row.memory_key,
      value: row.value,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at?.toISOString(),
    };
  }

  private requireDatabase(): void {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException(
        'Persistent memory requires DATABASE_URL',
      );
    }
  }
}
