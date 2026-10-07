import { Global, Module } from '@nestjs/common';
import { ToolEngineModule } from '../tools/tool-engine.module';
import { ToolApprovalController } from './tool-approval.controller';
import { ToolApprovalService } from './tool-approval.service';

@Global()
@Module({
  imports: [ToolEngineModule],
  controllers: [ToolApprovalController],
  providers: [ToolApprovalService],
  exports: [ToolApprovalService],
})
export class ToolApprovalModule {}
