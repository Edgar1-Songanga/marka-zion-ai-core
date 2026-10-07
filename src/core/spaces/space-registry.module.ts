import { Module } from '@nestjs/common';
import { SpaceRegistryService } from './space-registry.service';

@Module({
  providers: [SpaceRegistryService],
  exports: [SpaceRegistryService],
})
export class SpaceRegistryModule {}
