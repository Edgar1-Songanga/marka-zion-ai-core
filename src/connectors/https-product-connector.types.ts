import { ProductConnectorRequest, ProductConnectorResponse } from './product-connector.types';

export interface HttpsProductConnectorOptions {
  readonly spaceId: string;
  readonly baseUrl: string;
  readonly serviceToken: string;
  readonly allowedOperations: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
}

export interface HttpsProductConnectorError extends ProductConnectorResponse {
  readonly success: false;
  readonly errorCode:
    | 'INVALID_CONFIGURATION'
    | 'OPERATION_NOT_ALLOWED'
    | 'REQUEST_TIMEOUT'
    | 'UPSTREAM_UNAVAILABLE'
    | 'UPSTREAM_ERROR'
    | 'RESPONSE_TOO_LARGE'
    | 'INVALID_RESPONSE';
}

export type HttpsRequest = ProductConnectorRequest;
