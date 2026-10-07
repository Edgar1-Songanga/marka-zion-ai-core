import { Global, Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeAdminService } from './knowledge-admin.service';

@Global()
@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeAdminService],
  exports: [KnowledgeAdminService],
})
export class KnowledgeAdminModule {}
