import { AiSpace } from '../core/contracts/ai.types';

export interface MemoryRecord {
  readonly id: string;
  readonly space: AiSpace;
  readonly userId: string;
  readonly conversationId?: string;
  readonly key: string;
  readonly value: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface MemoryStore {
  get(userId: string, space: AiSpace, key: string): Promise<MemoryRecord | null>;
  set(record: MemoryRecord): Promise<void>;
}
