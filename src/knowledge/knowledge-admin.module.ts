import { Global, Module } from '@nestjs/common';
import { KnowledgeAdminService } from './knowledge-admin.service';

@Global()
@Module({
  providers: [KnowledgeAdminService],
  exports: [KnowledgeAdminService],
})
export class KnowledgeAdminModule {}
