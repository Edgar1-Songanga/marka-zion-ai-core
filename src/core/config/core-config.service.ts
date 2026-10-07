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

  get maxProviderResponseCharacters(): number {
    return this.boundedNumber('AI_MAX_PROVIDER_RESPONSE_CHARACTERS', 2000000, 10000, 10000000);
  }

  get maxGroundingCharacters(): number {
    return this.boundedNumber(
      'AI_MAX_GROUNDING_CHARACTERS',
      30000,
      1000,
      100000,
    );
  }

  assertProductionReady(): void {
    if (this.nodeEnv !== 'production') {
      return;
    }

    const required = [
      'AI_CORE_API_KEY',
      'AI_CONTEXT_SIGNING_SECRET',
      'AI_ALLOWED_CONTEXT_ISSUERS',
      'AI_CONTEXT_AUDIENCE',
      'AI_GATEWAY_API_KEY',
      'AI_MODEL',
      'DATABASE_URL',
    ];

    for (const key of required) {
      if (!process.env[key]?.trim()) {
        throw new Error(`Missing required production configuration: ${key}`);
      }
    }

    if (process.env.AI_CORE_API_KEY!.length < 32) {
      throw new Error('AI_CORE_API_KEY must be at least 32 characters');
    }

    if (process.env.AI_CONTEXT_SIGNING_SECRET!.length < 32) {
      throw new Error('AI_CONTEXT_SIGNING_SECRET must be at least 32 characters');
    }

    if (process.env.DATABASE_SSL === 'false') {
      throw new Error('DATABASE_SSL=false is forbidden in production');
    }

    const gatewayUrl = new URL(
      process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1',
    );

    if (gatewayUrl.protocol !== 'https:') {
      throw new Error('AI_GATEWAY_BASE_URL must use HTTPS in production');
    }
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
