import { AiSpace } from '../core/contracts/ai.types';

export interface SpacePolicy {
  readonly space: AiSpace;
  readonly systemInstruction: string;
  readonly allowedModelProviders?: readonly string[];
  readonly metadata?: Readonly<Record<string, string>>;
}
