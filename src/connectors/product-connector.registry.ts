import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ProductSpaceId } from '../core/contracts/tenant.types';
import { ProductConnector } from './product-connector.types';

@Injectable()
export class ProductConnectorRegistry {
  private readonly connectors = new Map<ProductSpaceId, ProductConnector>();

  register(connector: ProductConnector): void {
    this.connectors.set(connector.spaceId, connector);
  }

  resolve(spaceId: ProductSpaceId): ProductConnector {
    const connector = this.connectors.get(spaceId);
    if (!connector) {
      throw new ServiceUnavailableException(
        `No product connector is configured for space: ${spaceId}`,
      );
    }

    return connector;
  }

  list(): readonly ProductSpaceId[] {
    return [...this.connectors.keys()];
  }
}
