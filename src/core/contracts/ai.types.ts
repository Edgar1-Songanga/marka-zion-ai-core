export type AiSpace = 'zion' | 'marka';

export type AiOperation = 'CHAT' | 'TOOL_CALL' | 'KNOWLEDGE_QUERY';

export interface AiRequestContext {
  readonly requestId?: string;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly roles: readonly string[];
}

export interface AiRequest {
  readonly space: AiSpace;
  readonly operation: AiOperation;
  readonly input: string;
  readonly conversationId?: string;
  readonly context: AiRequestContext;
}

export interface AiResponse {
  readonly requestId: string;
  readonly correlationId: string;
  readonly space: AiSpace;
  readonly status: 'accepted';
}
