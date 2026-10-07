import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { AiSpace } from '../core/contracts/ai.types';
import { KnowledgeDocument, KnowledgeProvider } from './knowledge.types';

interface KnowledgeRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly space: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly metadata: Record<string, string>;
}

@Injectable()
export class KnowledgeService implements KnowledgeProvider {
  constructor(private readonly db: PostgresService) {}

  async search(query: {
    tenantId: string;
    space: AiSpace;
    query: string;
    limit: number;
  }): Promise<readonly KnowledgeDocument[]> {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException(
        'Persistent knowledge requires DATABASE_URL',
      );
    }

    const safeLimit = Math.min(Math.max(Math.floor(query.limit), 1), 20);

    const result = await this.db.query<KnowledgeRow>(
      `SELECT id, tenant_id, space, title, content, source, metadata
       FROM ai_knowledge_documents
       WHERE tenant_id = $1
         AND space = $2
         AND search_vector @@ plainto_tsquery('simple', $3)
       ORDER BY ts_rank(search_vector, plainto_tsquery('simple', $3)) DESC
       LIMIT $4`,
      [query.tenantId, query.space, query.query, safeLimit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      space: row.space,
      title: row.title,
      content: row.content,
      source: row.source,
      metadata: row.metadata ?? {},
    }));
  }
}
