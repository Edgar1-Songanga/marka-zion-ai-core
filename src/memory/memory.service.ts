import { Injectable } from '@nestjs/common';
import { AiSpace } from '../core/contracts/ai.types';
import { MemoryRecord, MemoryStore } from './memory.types';

@Injectable()
export class MemoryService implements MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();

  async get(userId: string, space: AiSpace, key: string): Promise<MemoryRecord | null> {
    const record = this.records.get(this.buildKey(userId, space, key));

    if (!record) return null;
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      this.records.delete(this.buildKey(userId, space, key));
      return null;
    }

    return record;
  }

  async set(record: MemoryRecord): Promise<void> {
    this.records.set(this.buildKey(record.userId, record.space, record.key), record);
  }

  private buildKey(userId: string, space: AiSpace, key: string): string {
    return [space, userId, key].join(':');
  }
}
