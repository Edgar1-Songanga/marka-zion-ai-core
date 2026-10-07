import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  get serviceName(): string {
    return process.env.SERVICE_NAME ?? 'marka-zion-ai-core';
  }

  get requestTimeoutMs(): number {
    return this.boundedNumber('AI_REQUEST_TIMEOUT_MS', 30000, 1000, 120000);
  }

  get maxInputCharacters(): number {
    return this.boundedNumber('AI_MAX_INPUT_CHARACTERS', 20000, 100, 100000);
  }

  get maxToolOutputCharacters(): number {
    return this.boundedNumber('AI_MAX_TOOL_OUTPUT_CHARACTERS', 50000, 100, 250000);
  }

  get maxAgentSteps(): number {
    return this.boundedNumber('AI_MAX_AGENT_STEPS', 8, 1, 20);
  }

  get maxToolCallsPerStep(): number {
    return this.boundedNumber('AI_MAX_TOOL_CALLS_PER_STEP', 8, 1, 32);
  }

  get maxGroundingCharacters(): number {
    return this.boundedNumber(
      'AI_MAX_GROUNDING_CHARACTERS',
      30000,
      1000,
      100000,
    );
  }

  private boundedNumber(
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const value = Number(process.env[key] ?? fallback);
    return Number.isFinite(value) && value >= minimum && value <= maximum
      ? Math.floor(value)
      : fallback;
  }
}
