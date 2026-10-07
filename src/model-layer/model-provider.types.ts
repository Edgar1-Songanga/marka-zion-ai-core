import { AiSpace } from '../core/contracts/ai.types';

export interface ModelToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface ModelToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

export type ModelMessage =
  | {
      readonly role: 'system' | 'user';
      readonly content: string;
    }
  | {
      readonly role: 'assistant';
      readonly content?: string | null;
      readonly toolCalls?: readonly ModelToolCall[];
    }
  | {
      readonly role: 'tool';
      readonly toolCallId: string;
      readonly toolName: string;
      readonly content: string;
    };

export interface ModelGenerationRequest {
  readonly space: AiSpace;
  readonly input: string;
  readonly systemInstruction?: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly conversationId?: string;
  readonly messages?: readonly ModelMessage[];
  readonly tools?: readonly ModelToolDefinition[];
}

export interface ModelGenerationResponse {
  readonly provider: string;
  readonly model: string;
  readonly text: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly toolCalls?: readonly ModelToolCall[];
}

export interface ModelProvider {
  readonly name: string;
  generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse>;
}
