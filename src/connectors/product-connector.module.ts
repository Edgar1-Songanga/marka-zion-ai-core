import { Module } from '@nestjs/common';
import { ProductConnectorRegistry } from './product-connector.registry';

@Module({
  providers: [ProductConnectorRegistry],
  exports: [ProductConnectorRegistry],
})
export class ProductConnectorModule {}
