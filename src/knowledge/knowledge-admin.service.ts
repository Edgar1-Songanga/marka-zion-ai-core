import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PostgresService } from '../infrastructure/postgres/postgres.service';

export interface KnowledgeUpsertInput {
  readonly id?: string;
  readonly tenantId: string;
  readonly space: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

@Injectable()
export class KnowledgeAdminService {
  constructor(private readonly db: PostgresService) {}

  async upsert(input: KnowledgeUpsertInput): Promise<{ id: string }> {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException('Knowledge storage is not configured');
    }

    if (
      !input.tenantId.trim() ||
      !input.space.trim() ||
      !input.title.trim() ||
      !input.content.trim() ||
      !input.source.trim()
    ) {
      throw new BadRequestException('Knowledge document fields are required');
    }

    if (input.content.length > 500_000) {
      throw new BadRequestException('Knowledge document is too large');
    }

    const id = input.id?.trim() || randomUUID();

    await this.db.query(
      `INSERT INTO ai_knowledge_documents
        (id, tenant_id, space, title, content, source, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         space = EXCLUDED.space,
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         source = EXCLUDED.source,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        id,
        input.tenantId,
        input.space,
        input.title,
        input.content,
        input.source,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return { id };
  }
}
