import { BadGatewayException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import {
  ProductConnector,
  ProductConnectorRequest,
  ProductConnectorResponse,
} from './product-connector.types';
import { HttpsProductConnectorOptions } from './https-product-connector.types';

@Injectable()
export class HttpsProductConnector implements ProductConnector {
  readonly spaceId: string;
  private readonly baseUrl: URL;
  private readonly options: HttpsProductConnectorOptions;
  private readonly dnsCache = new Map<string, { expiresAt: number; safe: boolean }>();

  constructor(options: HttpsProductConnectorOptions) {
    this.options = options;
    this.spaceId = options.spaceId;
    this.baseUrl = this.validateBaseUrl(options.baseUrl);
  }

  async execute(
    request: ProductConnectorRequest,
  ): Promise<ProductConnectorResponse> {
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
        errorMessage:
          'Allowlisted operation resolves outside the connector origin.',
      };
    }

    if (!(await this.isSafeDestination(url.hostname))) {
      return {
        success: false,
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Product connector destination is not allowed.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.serviceToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Correlation-ID': request.correlationId,
          ...(request.idempotencyKey
            ? { 'X-Idempotency-Key': request.idempotencyKey }
            : {}),
          ...(request.tenantId ? { 'X-Tenant-ID': request.tenantId } : {}),
          ...(request.userId ? { 'X-User-ID': request.userId } : {}),
        },
        body: JSON.stringify({
          input: request.input,
          operation: request.operation,
        }),
        signal: controller.signal,
      });

      const contentLength = Number(
        response.headers.get('content-length') ?? '0',
      );

      if (
        Number.isFinite(contentLength) &&
        contentLength > this.options.maxResponseBytes
      ) {
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

    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }

    return url;
  }

  private async isSafeDestination(hostname: string): Promise<boolean> {
    const normalized = hostname.toLowerCase().replace(/^[|]$/g, '');

    if (
      normalized === 'localhost' ||
      normalized === 'localhost.localdomain' ||
      this.isPrivateIp(normalized)
    ) {
      return false;
    }

    const cached = this.dnsCache.get(normalized);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.safe;
    }

    if (isIP(normalized)) {
      this.dnsCache.set(normalized, {
        expiresAt: Date.now() + 60_000,
        safe: true,
      });
      return true;
    }

    let addresses: readonly { address: string }[];

    try {
      addresses = await lookup(normalized, { all: true });
    } catch {
      return false;
    }

    const safe = addresses.length > 0 &&
      addresses.every((entry) => !this.isPrivateIp(entry.address));

    this.dnsCache.set(normalized, {
      expiresAt: Date.now() + 60_000,
      safe,
    });

    return safe;
  }

  private isPrivateIp(value: string): boolean {
    if (isIP(value) === 4) {
      const parts = value.split('.').map(Number);

      return (
        parts[0] === 10 ||
        parts[0] === 127 ||
        parts[0] === 169 && parts[1] === 254 ||
        parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31 ||
        parts[0] === 192 && parts[1] === 168 ||
        parts[0] === 0
      );
    }

    if (isIP(value) === 6) {
      const normalized = value.toLowerCase();

      return (
        normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb')
      );
    }

    return false;
  }
}
