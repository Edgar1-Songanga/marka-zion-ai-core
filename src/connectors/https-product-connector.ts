import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ProductConnector, ProductConnectorRequest, ProductConnectorResponse } from './product-connector.types';
import { HttpsProductConnectorOptions } from './https-product-connector.types';

@Injectable()
export class HttpsProductConnector implements ProductConnector {
  readonly spaceId: string;
  private readonly baseUrl: URL;
  private readonly options: HttpsProductConnectorOptions;

  constructor(options: HttpsProductConnectorOptions) {
    this.options = options;
    this.spaceId = options.spaceId;
    this.baseUrl = this.validateBaseUrl(options.baseUrl);
  }

  async execute(request: ProductConnectorRequest): Promise<ProductConnectorResponse> {
    if (request.spaceId !== this.spaceId) {
      throw new BadGatewayException('Connector space mismatch');
    }

    const path = this.options.allowedOperations[request.operation];
    if (!path) {
      return {
        success: false,
        errorCode: 'OPERATION_NOT_ALLOWED',
        errorMessage: 'Product operation is not allowlisted.',
      };
    }

    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) {
      return {
        success: false,
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Allowlisted operation resolves outside the connector origin.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.serviceToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Correlation-ID': request.correlationId,
          ...(request.tenantId ? { 'X-Tenant-ID': request.tenantId } : {}),
          ...(request.userId ? { 'X-User-ID': request.userId } : {}),
        },
        body: JSON.stringify({
          input: request.input,
          operation: request.operation,
        }),
        signal: controller.signal,
      });

      const contentLength = Number(response.headers.get('content-length') ?? '0');
      if (contentLength > this.options.maxResponseBytes) {
        return {
          success: false,
          errorCode: 'RESPONSE_TOO_LARGE',
          errorMessage: 'Product response exceeds the configured limit.',
        };
      }

      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > this.options.maxResponseBytes) {
        return {
          success: false,
          errorCode: 'RESPONSE_TOO_LARGE',
          errorMessage: 'Product response exceeds the configured limit.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          errorCode: 'UPSTREAM_ERROR',
          errorMessage: `Product API returned HTTP ${response.status}.`,
        };
      }

      try {
        return {
          success: true,
          data: JSON.parse(text),
        };
      } catch {
        return {
          success: false,
          errorCode: 'INVALID_RESPONSE',
          errorMessage: 'Product API returned invalid JSON.',
        };
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          errorCode: 'REQUEST_TIMEOUT',
          errorMessage: 'Product API request timed out.',
        };
      }

      return {
        success: false,
        errorCode: 'UPSTREAM_UNAVAILABLE',
        errorMessage: 'Product API request failed.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateBaseUrl(value: string): URL {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error('Product connector baseUrl must be a valid URL.');
    }

    if (url.protocol !== 'https:') {
      throw new Error('Product connector baseUrl must use HTTPS.');
    }

    if (url.username || url.password) {
      throw new Error('Product connector baseUrl must not contain credentials.');
    }

    return url;
  }
}
