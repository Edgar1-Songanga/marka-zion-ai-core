import { Global, Module } from '@nestjs/common';
import { CoreConfigService } from './core-config.service';

@Global()
@Module({
  providers: [CoreConfigService],
  exports: [CoreConfigService],
})
export class CoreConfigModule {}
