import { Module } from '@nestjs/common';
import { AiSecurityService } from './ai-security.service';

@Module({
  providers: [AiSecurityService],
  exports: [AiSecurityService],
})
export class AiSecurityModule {}
