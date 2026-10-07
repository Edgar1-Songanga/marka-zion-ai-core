import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { HttpsProductConnector } from './https-product-connector';
import { ProductConnectorRegistry } from './product-connector.registry';

@Injectable()
export class ConfiguredConnectorBootstrap implements OnModuleInit {
  constructor(private readonly registry: ProductConnectorRegistry) {}

  onModuleInit(): void {
    this.configure('zion');
    this.configure('marka');
  }

  private configure(spaceId: 'zion' | 'marka'): void {
    const prefix = spaceId.toUpperCase();
    const enabled = process.env[`AI_${prefix}_CONNECTOR_ENABLED`] === 'true';

    if (!enabled) {
      return;
    }

    const baseUrl = process.env[`AI_${prefix}_BASE_URL`];
    const serviceToken = process.env[`AI_${prefix}_SERVICE_TOKEN`];
    const operationsJson =
      process.env[`AI_${prefix}_OPERATIONS_JSON`] ?? '{}';

    if (!baseUrl || !serviceToken) {
      throw new Error(
        `AI_${prefix}_CONNECTOR_ENABLED requires base URL and service token`,
      );
    }

    let allowedOperations: Readonly<Record<string, string>>;

    try {
      allowedOperations = JSON.parse(operationsJson) as Record<string, string>;
    } catch {
      throw new Error(`AI_${prefix}_OPERATIONS_JSON must be valid JSON`);
    }

    if (
      Object.keys(allowedOperations).some(
        (operation) =>
          !operation.trim() ||
          typeof allowedOperations[operation] !== 'string' ||
          !allowedOperations[operation].startsWith('/'),
      )
    ) {
      throw new Error(
        `AI_${prefix}_OPERATIONS_JSON contains invalid operation paths`,
      );
    }

    this.registry.register(
      new HttpsProductConnector({
        spaceId,
        baseUrl,
        serviceToken,
        allowedOperations,
        timeoutMs: Number(process.env.AI_CONNECTOR_TIMEOUT_MS ?? 10000),
        maxResponseBytes: Number(
          process.env.AI_CONNECTOR_MAX_RESPONSE_BYTES ?? 1000000,
        ),
      }),
    );
  }
}
