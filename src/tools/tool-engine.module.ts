import { Module } from '@nestjs/common';
import { AiAuditModule } from '../core/audit/ai-audit.module';
import { CoreConfigModule } from '../core/config/core-config.module';
import { IdempotencyModule } from '../core/idempotency/idempotency.module';
import { ToolExecutionService } from './tool-execution.service';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  imports: [AiAuditModule, CoreConfigModule, IdempotencyModule],
  providers: [ToolRegistryService, ToolExecutionService],
  exports: [ToolRegistryService, ToolExecutionService],
})
export class ToolEngineModule {}
