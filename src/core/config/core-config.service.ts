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
    // Keep model calls below the Vercel serverless execution ceiling. The agent
    // also enforces a request-wide deadline across multi-step tool cycles.
    return this.boundedNumber('AI_REQUEST_TIMEOUT_MS', 18000, 1000, 20000);
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

    const provider = process.env.AI_PROVIDER?.trim() || 'vercel-ai-gateway';
    if (!['vercel-ai-gateway', 'cloudflare-workers-ai', 'openai-compatible'].includes(provider)) {
      throw new Error('AI_PROVIDER must be vercel-ai-gateway, cloudflare-workers-ai or openai-compatible');
    }

    const required = [
      'AI_CORE_API_KEY',
      'AI_CONTEXT_SIGNING_SECRET',
      'AI_ALLOWED_CONTEXT_ISSUERS',
      'AI_CONTEXT_AUDIENCE',
      'AI_MODEL',
      'DATABASE_URL',
      ...(provider === 'cloudflare-workers-ai'
        ? ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']
        : provider === 'openai-compatible'
          ? ['AI_INFERENCE_BASE_URL']
          : []),
    ];

    for (const key of required) {
      if (!process.env[key]?.trim()) {
        throw new Error(`Missing required production configuration: ${key}`);
      }
    }

    // In Vercel Functions, OIDC is injected into each request context and
    // must be resolved at request time via @vercel/oidc. It is not guaranteed
    // to exist as a process environment variable during runtime startup.
    if (
      provider === 'vercel-ai-gateway' &&
      !process.env.AI_GATEWAY_API_KEY?.trim() &&
      !process.env.VERCEL_OIDC_TOKEN?.trim() &&
      !process.env.VERCEL
    ) {
      throw new Error(
        'Missing AI Gateway authentication: configure AI_GATEWAY_API_KEY or run on Vercel with OIDC enabled',
      );
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

    if (provider === 'cloudflare-workers-ai') {
      if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID!.trim())) {
        throw new Error('CLOUDFLARE_ACCOUNT_ID must be a 32-character hexadecimal account ID');
      }
    } else if (provider === 'openai-compatible') {
      const inferenceUrl = new URL(process.env.AI_INFERENCE_BASE_URL!);
      if (inferenceUrl.protocol !== 'https:') {
        throw new Error('AI_INFERENCE_BASE_URL must use HTTPS in production');
      }
    } else {
      const gatewayUrl = new URL(process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1');
      if (gatewayUrl.protocol !== 'https:') throw new Error('AI_GATEWAY_BASE_URL must use HTTPS in production');
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
