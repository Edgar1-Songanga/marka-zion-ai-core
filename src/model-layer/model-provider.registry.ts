import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ModelProvider } from './model-provider.types';

@Injectable()
export class ModelProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  resolve(name?: string): ModelProvider {
    if (name) {
      const provider = this.providers.get(name);
      if (provider) return provider;
    }

    const first = this.providers.values().next().value as ModelProvider | undefined;

    if (!first) {
      throw new ServiceUnavailableException('No AI model provider is configured');
    }

    return first;
  }
}
