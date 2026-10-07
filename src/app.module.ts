import { Module } from '@nestjs/common';
import { AiAuditModule } from './core/audit/ai-audit.module';
import { CoreConfigModule } from './core/config/core-config.module';
import { AiSecurityModule } from './core/security/ai-security.module';
import { IdempotencyModule } from './core/idempotency/idempotency.module';
import { JobQueueModule } from './core/jobs/job-queue.module';
import { QuotaModule } from './core/quotas/quota.module';
import { UsageModule } from './core/observability/usage.module';
import { SpaceRegistryModule } from './core/spaces/space-registry.module';
import { HealthModule } from './health/health.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { KnowledgeAdminModule } from './knowledge/knowledge-admin.module';
import { MemoryModule } from './memory/memory.module';
import { ModelLayerModule } from './model-layer/model-layer.module';
import { SpacePolicyModule } from './model-layer/space-policy.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { ToolEngineModule } from './tools/tool-engine.module';
import { ProductConnectorModule } from './connectors/product-connector.module';
import { HttpsProductConnectorModule } from './connectors/https-product-connector.module';
import { PostgresModule } from './infrastructure/postgres/postgres.module';
import { ToolApprovalModule } from './approvals/tool-approval.module';

@Module({
  imports: [
    CoreConfigModule,
    PostgresModule,
    AiAuditModule,
    AiSecurityModule,
    IdempotencyModule,
    JobQueueModule,
    QuotaModule,
    UsageModule,
    SpaceRegistryModule,
    ModelLayerModule,
    SpacePolicyModule,
    KnowledgeModule,
    KnowledgeAdminModule,
    MemoryModule,
    ToolEngineModule,
    ToolApprovalModule,
    ProductConnectorModule,
    HttpsProductConnectorModule,
    HealthModule,
    AiGatewayModule,
  ],
})
export class AppModule {}
