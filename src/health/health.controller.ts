import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: string; service: string; version: string } {
    return {
      status: 'ok',
      service: 'marka-zion-ai-core',
      version: '0.1.0',
    };
  }
}
