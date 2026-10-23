import { Module } from '@nestjs/common';
import { AgentOrchestratorModule } from '../agent/agent-orchestrator.module';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { AiSecurityModule } from '../core/security/ai-security.module';
import { QuotaModule } from '../core/quotas/quota.module';
import { UsageModule } from '../core/observability/usage.module';
import { ModelLayerModule } from '../model-layer/model-layer.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';

@Module({
  imports: [
    AiAuditModule,
    AiSecurityModule,
    AgentOrchestratorModule,
    ModelLayerModule,
    QuotaModule,
    UsageModule,
    KnowledgeModule,
    ToolEngineModule,
  ],
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
