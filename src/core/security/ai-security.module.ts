import { Module } from '@nestjs/common';
import { AiApiKeyGuard } from './ai-api-key.guard';
import { AiSecurityService } from './ai-security.service';

@Module({
  providers: [AiApiKeyGuard, AiSecurityService],
  exports: [AiApiKeyGuard, AiSecurityService],
})
export class AiSecurityModule {}
