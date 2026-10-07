import { Global, Module } from '@nestjs/common';
import { ToolApprovalModule } from '../approvals/tool-approval.module';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { CoreConfigModule } from '../core/config/core-config.module';
import { QuotaModule } from '../core/quotas/quota.module';
import { UsageModule } from '../core/observability/usage.module';
import { ModelLayerModule } from '../model-layer/model-layer.module';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentFactoryService } from './agent-factory.service';
import { SkillRegistryService } from './skill-registry.service';
import { MissionOrchestratorService } from './mission-orchestrator.service';
import { MissionRepositoryService } from './mission-repository.service';
import { MissionTaskRepositoryService } from './mission-task-repository.service';
import { MissionExecutionService } from './mission-execution.service';

@Global()
@Module({
  imports: [CoreConfigModule, ModelLayerModule, ToolEngineModule, ToolApprovalModule, AiAuditModule, QuotaModule, UsageModule],
  providers: [
    AgentOrchestratorService,
    AgentRegistryService,
    AgentFactoryService,
    SkillRegistryService,
    MissionOrchestratorService,
    MissionRepositoryService,
    MissionTaskRepositoryService,
    MissionExecutionService,
  ],
  exports: [
    AgentOrchestratorService,
    AgentRegistryService,
    AgentFactoryService,
    SkillRegistryService,
    MissionOrchestratorService,
    MissionRepositoryService,
    MissionTaskRepositoryService,
    MissionExecutionService,
  ],
})
export class AgentOrchestratorModule {}
