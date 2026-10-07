import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../core/config/core-config.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MemoryModule } from '../memory/memory.module';
import { ModelProviderRegistry } from './model-provider.registry';
import { VercelAiGatewayProvider } from './vercel-ai-gateway.provider';

@Module({
  imports: [CoreConfigModule, KnowledgeModule, MemoryModule],
  providers: [ModelProviderRegistry, VercelAiGatewayProvider],
  exports: [ModelProviderRegistry],
})
export class ModelLayerModule {}
