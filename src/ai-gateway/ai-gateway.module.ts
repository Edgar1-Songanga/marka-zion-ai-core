import { Module } from '@nestjs/common';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { AiSecurityModule } from '../core/security/ai-security.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';

@Module({
  imports: [
    AiAuditModule,
    AiSecurityModule,
    KnowledgeModule,
    ToolEngineModule,
  ],
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
