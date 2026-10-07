export type AiSpace = 'zion' | 'marka';

export interface AiRequest {
  readonly space: AiSpace;
  readonly input: string;
  readonly conversationId?: string;
  readonly userId?: string;
}

export interface AiResponse {
  readonly requestId: string;
  readonly space: AiSpace;
  readonly status: 'accepted';
}
