import { AiSpace } from '../core/contracts/ai.types';

export type ToolPermission = 'READ' | 'WRITE' | 'SENSITIVE_WRITE';

export interface AiToolContext {
  readonly space: AiSpace;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly correlationId: string;
  readonly idempotencyKey?: string;
}

export interface AiToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly permission: ToolPermission;
  readonly spaces: readonly AiSpace[];
  readonly validateInput?: (input: unknown) => input is TInput;
  execute(input: TInput, context: AiToolContext): Promise<TOutput>;
}
