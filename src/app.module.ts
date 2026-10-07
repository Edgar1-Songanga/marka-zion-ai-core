import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';

@Module({
  imports: [HealthModule, AiGatewayModule],
})
export class AppModule {}
