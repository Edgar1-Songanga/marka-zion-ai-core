import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CoreConfigService } from '../core/config/core-config.service';
import {
  ModelGenerationRequest,
  ModelGenerationResponse,
  ModelProvider,
} from './model-provider.types';

interface ChatCompletionResponse {
  readonly choices?: readonly [{
    readonly message?: {
      readonly content?: string | null;
    };
  }];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

@Injectable()
export class VercelAiGatewayProvider implements ModelProvider {
  readonly name = 'vercel-ai-gateway';

  constructor(
    private readonly config: CoreConfigService,
    private readonly policies: SpacePolicyRegistry,
  ) {}

  async generate(request: ModelGenerationRequest): Promise<ModelGenerationResponse> {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const model = process.env.AI_MODEL;

    if (!apiKey || !model) {
      throw new ServiceUnavailableException(
        'AI Gateway provider requires AI_GATEWAY_API_KEY and AI_MODEL',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Correlation-ID': request.correlationId,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
              request.systemInstruction?.trim() ||
              this.policies.resolve(request.space).systemInstruction,
              },
              {
                role: 'user',
                content: request.input,
              },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new ServiceUnavailableException(
          `AI provider request failed (${response.status}): ${detail.slice(0, 500)}`,
        );
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const text = payload.choices?.[0]?.message?.content;

      if (!text) {
        throw new ServiceUnavailableException('AI provider returned no text');
      }

      return {
        provider: this.name,
        model,
        text,
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      throw new ServiceUnavailableException('AI provider request failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private get baseUrl(): string {
    return (process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1').replace(/\/$/, '');
  }

}