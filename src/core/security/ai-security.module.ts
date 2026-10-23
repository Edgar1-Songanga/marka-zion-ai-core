import { Module } from '@nestjs/common';
import { SpaceRegistryModule } from '../spaces/space-registry.module';
import { AiApiKeyGuard } from './ai-api-key.guard';
import { AiSecurityService } from './ai-security.service';

@Module({
  imports: [SpaceRegistryModule],
  providers: [AiApiKeyGuard, AiSecurityService],
  exports: [AiApiKeyGuard, AiSecurityService],
})
export class AiSecurityModule {}
