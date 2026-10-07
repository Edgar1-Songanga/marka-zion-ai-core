import { Injectable } from '@nestjs/common';
import { AiSpace } from '../core/contracts/ai.types';
import { KnowledgeDocument, KnowledgeProvider } from './knowledge.types';

@Injectable()
export class KnowledgeService implements KnowledgeProvider {
  async search(query: { space: AiSpace; query: string; limit: number }): Promise<readonly KnowledgeDocument[]> {
    // The production RAG adapter will be attached here without allowing the
    // AI layer to become a source of truth for product data.
    void query;
    return [];
  }
}
