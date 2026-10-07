import { Global, Module } from '@nestjs/common';
import { ToolApprovalModule } from '../approvals/tool-approval.module';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { CoreConfigModule } from '../core/config/core-config.module';
import { QuotaModule } from '../core/quotas/quota.module';
import { UsageModule } from '../core/observability/usage.module';
import { ModelLayerModule } from '../model-layer/model-layer.module';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { AgentOrchestratorService } from './agent-orchestrator.service';

@Global()
@Module({
  imports: [
    CoreConfigModule,
    ModelLayerModule,
    ToolEngineModule,
    ToolApprovalModule,
    AiAuditModule,
    QuotaModule,
    UsageModule,
  ],
  providers: [AgentOrchestratorService],
  exports: [AgentOrchestratorService],
})
export class AgentOrchestratorModule {}
