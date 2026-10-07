import { Global, Module } from '@nestjs/common';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { ToolApprovalService } from './tool-approval.service';

@Global()
@Module({
  imports: [ToolEngineModule],
  providers: [ToolApprovalService],
  exports: [ToolApprovalService],
})
export class ToolApprovalModule {}
