import { Module } from '@nestjs/common';
import { AiAuditService } from './ai-audit.service';

@Module({
  providers: [AiAuditService],
  exports: [AiAuditService],
})
export class AiAuditModule {}
