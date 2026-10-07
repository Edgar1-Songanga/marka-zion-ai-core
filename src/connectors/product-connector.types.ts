import { ProductSpaceId } from '../core/contracts/tenant.types';

export interface ProductConnectorRequest {
  readonly spaceId: ProductSpaceId;
  readonly operation: string;
  readonly input: unknown;
  readonly correlationId: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly idempotencyKey?: string;
}

export interface ProductConnectorResponse {
  readonly success: boolean;
  readonly data?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface ProductConnector {
  readonly spaceId: ProductSpaceId;
  execute(request: ProductConnectorRequest): Promise<ProductConnectorResponse>;
}
