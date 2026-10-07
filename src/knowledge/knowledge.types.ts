import { AiSpace } from '../core/contracts/ai.types';

export interface KnowledgeQuery {
  readonly space: AiSpace;
  readonly query: string;
  readonly limit: number;
}

export interface KnowledgeDocument {
  readonly id: string;
  readonly space: AiSpace;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface KnowledgeProvider {
  search(query: KnowledgeQuery): Promise<readonly KnowledgeDocument[]>;
}
