import { Module } from '@nestjs/common';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { AiSecurityModule } from '../core/security/ai-security.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';

@Module({
  imports: [AiAuditModule, AiSecurityModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
