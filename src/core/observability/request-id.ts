import { randomUUID } from 'node:crypto';

export function createCorrelationId(value?: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length <= 128 ? normalized : randomUUID();
}
