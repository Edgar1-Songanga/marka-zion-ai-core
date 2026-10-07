import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PostgresService } from '../infrastructure/postgres/postgres.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: PostgresService) {}

  @Get()
  getHealth(): { status: string; service: string; version: string } {
    return {
      status: 'ok',
      service: 'marka-zion-ai-core',
      version: '0.1.0',
    };
  }

  @Get('live')
  getLive(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReady(): Promise<{ status: 'ready' }> {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.DATABASE_URL) {
        throw new ServiceUnavailableException('Database is not configured');
      }

      if (!process.env.AI_CORE_API_KEY) {
        throw new ServiceUnavailableException(
          'AI Core authentication is not configured',
        );
      }

      if (!process.env.AI_CONTEXT_SIGNING_SECRET) {
        throw new ServiceUnavailableException(
          'AI context signing is not configured',
        );
      }

      if (!process.env.AI_GATEWAY_API_KEY || !process.env.AI_MODEL) {
        throw new ServiceUnavailableException(
          'AI provider configuration is not complete',
        );
      }
    }

    if (process.env.DATABASE_URL) {
      try {
        await this.db.query('SELECT 1');
      } catch {
        throw new ServiceUnavailableException('Database is unavailable');
      }
    }

    return { status: 'ready' };
  }
}
