import { Global, Module } from '@nestjs/common';
import { ConfiguredConnectorBootstrap } from './configured-connector.bootstrap';
import { ProductConnectorRegistry } from './product-connector.registry';

@Global()
@Module({
  providers: [ProductConnectorRegistry, ConfiguredConnectorBootstrap],
  exports: [ProductConnectorRegistry],
})
export class ProductConnectorModule {}
