import { Module } from '@nestjs/common';
import { ModelProviderRegistry } from './model-provider.registry';

@Module({
  providers: [ModelProviderRegistry],
  exports: [ModelProviderRegistry],
})
export class ModelLayerModule {}
