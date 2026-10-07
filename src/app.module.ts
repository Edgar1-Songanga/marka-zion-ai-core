import { Module } from '@nestjs/common';
import { AiAuditModule } from './core/audit/ai-audit.module';
import { CoreConfigModule } from './core/config/core-config.module';
import { AiSecurityModule } from './core/security/ai-security.module';
import { SpaceRegistryModule } from './core/spaces/space-registry.module';
import { HealthModule } from './health/health.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MemoryModule } from './memory/memory.module';
import { ModelLayerModule } from './model-layer/model-layer.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { ToolEngineModule } from './tools/tool-engine.module';
import { ProductConnectorModule } from './connectors/product-connector.module';

@Module({
  imports: [
    CoreConfigModule,
    AiAuditModule,
    AiSecurityModule,
    SpaceRegistryModule,
    ModelLayerModule,
    KnowledgeModule,
    MemoryModule,
    ToolEngineModule,
    ProductConnectorModule,
    HealthModule,
    AiGatewayModule,
  ],
})
export class AppModule {}
