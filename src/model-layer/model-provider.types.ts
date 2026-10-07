import { AiSpace } from '../core/contracts/ai.types';

export interface ModelGenerationRequest {
  readonly space: AiSpace;
  readonly input: string;
  readonly systemInstruction?: string;
  readonly correlationId: string;
}

export interface ModelGenerationResponse {
  readonly provider: string;
  readonly model: string;
  readonly text: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export interface ModelProvider {
  readonly name: string;
  generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse>;
}
