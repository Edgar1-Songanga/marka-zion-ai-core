import { Global, Module } from '@nestjs/common';
import { SpacePolicyRegistry } from './space-policy.registry';

@Global()
@Module({
  providers: [SpacePolicyRegistry],
  exports: [SpacePolicyRegistry],
})
export class SpacePolicyModule {}
