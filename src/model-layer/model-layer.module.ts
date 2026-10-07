import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../core/config/core-config.module';
import { ModelProviderRegistry } from './model-provider.registry';
import { VercelAiGatewayProvider } from './vercel-ai-gateway.provider';

@Module({
  imports: [CoreConfigModule],
  providers: [ModelProviderRegistry, VercelAiGatewayProvider],
  exports: [ModelProviderRegistry],
})
export class ModelLayerModule {}
